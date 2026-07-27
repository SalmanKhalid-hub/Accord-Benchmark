import {
  ITemplateModel,
  ILateDeliveryAndPenaltyRequest,
  ILateDeliveryAndPenaltyResponse,
} from './generated/org.accordproject.latedeliveryandpenaltyoptionalthis@0.2.0';

// @ts-ignore
class LateDeliveryAndPenaltyLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: ILateDeliveryAndPenaltyRequest
  ): Promise<{ result: ILateDeliveryAndPenaltyResponse }> {
    // Check if force majeure applies
    const forceMajeure = request.forceMajeure ?? data.forceMajeure ?? 0;
    if (forceMajeure > 0) {
      // No penalty in case of force majeure
      const penalty = {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: 0,
        currencyCode: request.goodsValue.currencyCode,
      };
      return {
        result: {
          $class:
            'org.accordproject.latedeliveryandpenaltyoptionalthis@0.2.0.LateDeliveryAndPenaltyResponse',
          $timestamp: new Date(),
          penalty,
          buyerMayTerminate: false,
        },
      };
    }

    // Calculate delay in days
    const agreedDelivery = new Date(request.agreedDelivery);
    const deliveredAt = request.deliveredAt
      ? new Date(request.deliveredAt)
      : new Date();
    const delayMs = deliveredAt.getTime() - agreedDelivery.getTime();
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
            'org.accordproject.latedeliveryandpenaltyoptionalthis@0.2.0.LateDeliveryAndPenaltyResponse',
          $timestamp: new Date(),
          penalty,
          buyerMayTerminate: false,
        },
      };
    }

    // Calculate number of penalty periods
    const penaltyDurationDays = this.durationToDays(data.penaltyDuration);
    const penaltyPeriods = Math.ceil(delayDays / penaltyDurationDays);

    // Calculate penalty amount
    const goodsValueAmount = request.goodsValue.doubleValue;
    const penaltyAmount =
      (penaltyPeriods * data.penaltyPercentage * goodsValueAmount) / 100;

    // Apply cap
    const capAmount = (data.capPercentage * goodsValueAmount) / 100;
    const finalPenaltyAmount = Math.min(penaltyAmount, capAmount);

    // Check if buyer may terminate
    const terminationDays = this.durationToDays(data.termination);
    const buyerMayTerminate = delayDays > terminationDays;

    const penalty = {
      $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
      doubleValue: finalPenaltyAmount,
      currencyCode: request.goodsValue.currencyCode,
    };

    return {
      result: {
        $class:
          'org.accordproject.latedeliveryandpenaltyoptionalthis@0.2.0.LateDeliveryAndPenaltyResponse',
        $timestamp: new Date(),
        penalty,
        buyerMayTerminate,
      },
    };
  }

  private durationToDays(duration: any): number {
    const amount = duration.amount;
    const unit = duration.unit;

    switch (unit) {
      case 'DAYS':
        return amount;
      case 'HOURS':
        return amount / 24;
      case 'MINUTES':
        return amount / (24 * 60);
      case 'SECONDS':
        return amount / (24 * 60 * 60);
      case 'WEEKS':
        return amount * 7;
      case 'MONTHS':
        return amount * 30;
      case 'YEARS':
        return amount * 365;
      default:
        return amount;
    }
  }
}

export default LateDeliveryAndPenaltyLogic;
