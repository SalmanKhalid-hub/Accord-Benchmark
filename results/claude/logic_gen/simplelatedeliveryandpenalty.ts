import {
  ITemplateModel,
  ISimpleLateDeliveryAndPenaltyRequest,
  ISimpleLateDeliveryAndPenaltyResponse,
} from './generated/org.accordproject.simplelatedeliveryandpenalty@0.2.0';

// @ts-ignore
class SimpleLateDeliveryAndPenaltyLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: ISimpleLateDeliveryAndPenaltyRequest
  ): Promise<{ result: ISimpleLateDeliveryAndPenaltyResponse }> {
    const goodsValue = request.goodsValue.doubleValue;
    const currencyCode = request.goodsValue.currencyCode;

    let penalty = 0;
    let buyerMayTerminate = false;

    if (request.deliveredAt) {
      const agreedDeliveryTime = request.agreedDelivery.getTime();
      const deliveredAtTime = request.deliveredAt.getTime();

      if (deliveredAtTime > agreedDeliveryTime) {
        const delayMs = deliveredAtTime - agreedDeliveryTime;
        const penaltyDurationMs =
          data.penaltyDuration.amount *
          this.durationToMilliseconds(data.penaltyDuration.unit);
        const delayPeriods = Math.ceil(delayMs / penaltyDurationMs);

        const penaltyAmount =
          (delayPeriods * data.penaltyPercentage * goodsValue) / 100;
        const maxPenalty = (data.capPercentage * goodsValue) / 100;

        penalty = Math.min(penaltyAmount, maxPenalty);

        const maximumDelayMs =
          data.maximumDelay.amount *
          this.durationToMilliseconds(data.maximumDelay.unit);

        if (delayMs > maximumDelayMs) {
          buyerMayTerminate = true;
        }
      }
    }

    const response: ISimpleLateDeliveryAndPenaltyResponse = {
      $class:
        'org.accordproject.simplelatedeliveryandpenalty@0.2.0.SimpleLateDeliveryAndPenaltyResponse',
      $timestamp: new Date(),
      penalty: {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: penalty,
        currencyCode: currencyCode,
      },
      buyerMayTerminate: buyerMayTerminate,
    };

    return { result: response };
  }

  private durationToMilliseconds(unit: string): number {
    switch (unit.toUpperCase()) {
      case 'MILLIS':
        return 1;
      case 'SECONDS':
        return 1000;
      case 'MINUTES':
        return 60 * 1000;
      case 'HOURS':
        return 60 * 60 * 1000;
      case 'DAYS':
        return 24 * 60 * 60 * 1000;
      case 'WEEKS':
        return 7 * 24 * 60 * 60 * 1000;
      case 'MONTHS':
        return 30 * 24 * 60 * 60 * 1000;
      case 'YEARS':
        return 365 * 24 * 60 * 60 * 1000;
      default:
        return 1;
    }
  }
}

export default SimpleLateDeliveryAndPenaltyLogic;
