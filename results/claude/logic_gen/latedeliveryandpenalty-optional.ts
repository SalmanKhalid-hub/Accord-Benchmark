import {
  ITemplateModel,
  ILateDeliveryAndPenaltyRequest,
  ILateDeliveryAndPenaltyResponse,
} from './generated/org.accordproject.latedeliveryandpenaltyoptional@0.2.0';

// @ts-ignore
class LateDeliveryAndPenaltyLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: ILateDeliveryAndPenaltyRequest
  ): Promise<{ result: ILateDeliveryAndPenaltyResponse }> {
    // Check if force majeure applies
    const forceMajeure = request.forceMajeure || data.forceMajeure;
    if (forceMajeure && forceMajeure.miles >= 100) {
      // No penalty due to force majeure
      const penalty = {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: 0,
        currencyCode: request.goodsValue.currencyCode,
      };
      return {
        result: {
          $class:
            'org.accordproject.latedeliveryandpenaltyoptional@0.2.0.LateDeliveryAndPenaltyResponse',
          $timestamp: new Date(),
          penalty,
          buyerMayTerminate: false,
        },
      };
    }

    // Calculate delay in days
    const agreedDeliveryTime = new Date(request.agreedDelivery).getTime();
    const deliveredAtTime = request.deliveredAt
      ? new Date(request.deliveredAt).getTime()
      : new Date().getTime();

    const delayMs = deliveredAtTime - agreedDeliveryTime;
    const delayDays = Math.ceil(delayMs / (1000 * 60 * 60 * 24));

    // If no delay, no penalty
    if (delayDays <= 0) {
      const penalty = {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: 0,
        currencyCode: request.goodsValue.currencyCode,
      };
      return {
        result: {
          $class:
            'org.accordproject.latedeliveryandpenaltyoptional@0.2.0.LateDeliveryAndPenaltyResponse',
          $timestamp: new Date(),
          penalty,
          buyerMayTerminate: false,
        },
      };
    }

    // Calculate penalty duration in days
    const penaltyDurationDays =
      data.penaltyDuration.amount *
      this.getTemporalUnitInDays(data.penaltyDuration.unit);

    // Calculate number of penalty periods
    const penaltyPeriods = Math.ceil(delayDays / penaltyDurationDays);

    // Calculate penalty amount
    const goodsValueAmount = request.goodsValue.doubleValue;
    const penaltyAmount =
      goodsValueAmount * (data.penaltyPercentage / 100) * penaltyPeriods;

    // Apply cap
    const capAmount = goodsValueAmount * (data.capPercentage / 100);
    const finalPenaltyAmount = Math.min(penaltyAmount, capAmount);

    // Check if buyer may terminate
    const terminationDurationDays =
      data.termination.amount *
      this.getTemporalUnitInDays(data.termination.unit);
    const buyerMayTerminate = delayDays > terminationDurationDays;

    const penalty = {
      $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
      doubleValue: finalPenaltyAmount,
      currencyCode: request.goodsValue.currencyCode,
    };

    return {
      result: {
        $class:
          'org.accordproject.latedeliveryandpenaltyoptional@0.2.0.LateDeliveryAndPenaltyResponse',
        $timestamp: new Date(),
        penalty,
        buyerMayTerminate,
      },
    };
  }

  private getTemporalUnitInDays(unit: string): number {
    switch (unit) {
      case 'DAYS':
        return 1;
      case 'WEEKS':
        return 7;
      case 'MONTHS':
        return 30;
      case 'YEARS':
        return 365;
      case 'HOURS':
        return 1 / 24;
      case 'MINUTES':
        return 1 / (24 * 60);
      case 'SECONDS':
        return 1 / (24 * 60 * 60);
      default:
        return 1;
    }
  }
}

export default LateDeliveryAndPenaltyLogic;
