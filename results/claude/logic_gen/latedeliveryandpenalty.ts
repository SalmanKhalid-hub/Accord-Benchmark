import {
  ITemplateModel,
  ILateDeliveryAndPenaltyRequest,
  ILateDeliveryAndPenaltyResponse,
} from './generated/org.accordproject.latedeliveryandpenalty@0.2.0';

// @ts-ignore
class LateDeliveryAndPenaltyLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: ILateDeliveryAndPenaltyRequest
  ): Promise<{ result: ILateDeliveryAndPenaltyResponse }> {
    // If force majeure, no penalty
    if (request.forceMajeure) {
      const response: ILateDeliveryAndPenaltyResponse = {
        $class: 'org.accordproject.latedeliveryandpenalty@0.2.0.LateDeliveryAndPenaltyResponse',
        penalty: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: 0,
          currencyCode: request.goodsValue.currencyCode,
        },
        buyerMayTerminate: false,
      };
      return { result: response };
    }

    // If no delivery date provided, no penalty
    if (!request.deliveredAt) {
      const response: ILateDeliveryAndPenaltyResponse = {
        $class: 'org.accordproject.latedeliveryandpenalty@0.2.0.LateDeliveryAndPenaltyResponse',
        penalty: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: 0,
          currencyCode: request.goodsValue.currencyCode,
        },
        buyerMayTerminate: false,
      };
      return { result: response };
    }

    // Calculate delay in milliseconds
    const delayMs = request.deliveredAt.getTime() - request.agreedDelivery.getTime();

    // If delivered on time or early, no penalty
    if (delayMs <= 0) {
      const response: ILateDeliveryAndPenaltyResponse = {
        $class: 'org.accordproject.latedeliveryandpenalty@0.2.0.LateDeliveryAndPenaltyResponse',
        penalty: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: 0,
          currencyCode: request.goodsValue.currencyCode,
        },
        buyerMayTerminate: false,
      };
      return { result: response };
    }

    // Convert delay to days
    const delayDays = delayMs / (1000 * 60 * 60 * 24);

    // Get penalty duration in days
    const penaltyDurationMs = this.durationToMilliseconds(data.penaltyDuration);
    const penaltyDurationDays = penaltyDurationMs / (1000 * 60 * 60 * 24);

    // Calculate number of penalty periods (round up fractional days)
    const penaltyPeriods = Math.ceil(delayDays / penaltyDurationDays);

    // Calculate penalty amount
    const goodsValueAmount = request.goodsValue.doubleValue;
    let penaltyAmount = (penaltyPeriods * data.penaltyPercentage / 100) * goodsValueAmount;

    // Apply cap
    const capAmount = (data.capPercentage / 100) * goodsValueAmount;
    if (penaltyAmount > capAmount) {
      penaltyAmount = capAmount;
    }

    // Check if buyer may terminate
    const terminationDurationMs = this.durationToMilliseconds(data.termination);
    const terminationDurationDays = terminationDurationMs / (1000 * 60 * 60 * 24);
    const buyerMayTerminate = delayDays > terminationDurationDays;

    const response: ILateDeliveryAndPenaltyResponse = {
      $class: 'org.accordproject.latedeliveryandpenalty@0.2.0.LateDeliveryAndPenaltyResponse',
      penalty: {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: penaltyAmount,
        currencyCode: request.goodsValue.currencyCode,
      },
      buyerMayTerminate,
    };

    return { result: response };
  }

  private durationToMilliseconds(duration: any): number {
    const amount = duration.amount;
    const unit = duration.unit;

    switch (unit) {
      case 'MILLIS':
        return amount;
      case 'SECONDS':
        return amount * 1000;
      case 'MINUTES':
        return amount * 1000 * 60;
      case 'HOURS':
        return amount * 1000 * 60 * 60;
      case 'DAYS':
        return amount * 1000 * 60 * 60 * 24;
      case 'WEEKS':
        return amount * 1000 * 60 * 60 * 24 * 7;
      default:
        throw new Error(`Unknown temporal unit: ${unit}`);
    }
  }
}

export default LateDeliveryAndPenaltyLogic;
