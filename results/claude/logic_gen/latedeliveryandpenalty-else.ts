import {
  ITemplateModel,
  ILateDeliveryAndPenaltyRequest,
  ILateDeliveryAndPenaltyResponse,
} from './generated/org.accordproject.latedeliveryandpenaltyelse@0.2.0';

// @ts-ignore
class LateDeliveryAndPenaltyLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: ILateDeliveryAndPenaltyRequest
  ): Promise<{ result: ILateDeliveryAndPenaltyResponse }> {
    // Check if force majeure applies
    if (request.forceMajeure) {
      const response: ILateDeliveryAndPenaltyResponse = {
        $class:
          'org.accordproject.latedeliveryandpenaltyelse@0.2.0.LateDeliveryAndPenaltyResponse',
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
        $class:
          'org.accordproject.latedeliveryandpenaltyelse@0.2.0.LateDeliveryAndPenaltyResponse',
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
    const delayMs =
      request.deliveredAt.getTime() - request.agreedDelivery.getTime();

    // If delivered on time or early, no penalty
    if (delayMs <= 0) {
      const response: ILateDeliveryAndPenaltyResponse = {
        $class:
          'org.accordproject.latedeliveryandpenaltyelse@0.2.0.LateDeliveryAndPenaltyResponse',
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

    // Calculate number of penalty periods (penaltyDuration units)
    let penaltyPeriods = 0;
    const penaltyDurationMs = this.durationToMilliseconds(
      data.penaltyDuration
    );
    penaltyPeriods = Math.ceil(delayDays * (1000 * 60 * 60 * 24) / penaltyDurationMs);

    // Calculate penalty amount
    const goodsValueAmount = request.goodsValue.doubleValue;
    let penaltyAmount =
      (penaltyPeriods * data.penaltyPercentage * goodsValueAmount) / 100;

    // Apply cap
    const capAmount = (data.capPercentage * goodsValueAmount) / 100;
    if (penaltyAmount > capAmount) {
      penaltyAmount = capAmount;
    }

    // Check if buyer may terminate
    const terminationDurationMs = this.durationToMilliseconds(data.termination);
    const buyerMayTerminate = delayMs > terminationDurationMs;

    const response: ILateDeliveryAndPenaltyResponse = {
      $class:
        'org.accordproject.latedeliveryandpenaltyelse@0.2.0.LateDeliveryAndPenaltyResponse',
      penalty: {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: penaltyAmount,
        currencyCode: request.goodsValue.currencyCode,
      },
      buyerMayTerminate: buyerMayTerminate,
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
        throw new Error(`Unknown time unit: ${unit}`);
    }
  }
}

export default LateDeliveryAndPenaltyLogic;
