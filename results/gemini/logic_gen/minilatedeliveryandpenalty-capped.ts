// @ts-ignore
class MiniLateDeliveryAndPenaltyCappedLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ILateRequest): Promise<{ result: ILateResponse }> {
    const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

    const agreedDeliveryTime = request.agreedDelivery.getTime();
    const deliveredAtTime = request.deliveredAt.getTime();

    const delayMilliseconds = deliveredAtTime - agreedDeliveryTime;
    const delayDays = delayMilliseconds / MILLISECONDS_PER_DAY;

    let penaltyAmount = 0;
    let buyerMayTerminate = false;

    if (delayDays > 0) {
      const penaltyDurationDays = data.penaltyDuration.amount;
      const penaltyPercentage = data.penaltyPercentage;
      const capPercentage = data.capPercentage;
      const goodsValue = request.goodsValue.doubleValue;
      const currencyCode = request.goodsValue.currencyCode;

      const penaltyPeriods = Math.floor(delayDays / penaltyDurationDays);
      let calculatedPenalty = goodsValue * (penaltyPeriods * penaltyPercentage / 100);

      const maxPenalty = goodsValue * (capPercentage / 100);
      penaltyAmount = Math.min(calculatedPenalty, maxPenalty);

      const maximumDelayDays = data.maximumDelay.amount;
      if (delayDays > maximumDelayDays) {
        buyerMayTerminate = true;
      }
    }

    return {
      result: {
        $class: 'org.accordproject.minilatedeliveryandpenaltycapped@0.2.0.LateResponse',
        $timestamp: new Date(),
        penalty: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: penaltyAmount,
          currencyCode: request.goodsValue.currencyCode,
        },
        buyerMayTerminate: buyerMayTerminate,
      },
    };
  }
}

import {
  ITemplateModel,
  ILateRequest,
  ILateResponse,
} from './generated/org.accordproject.minilatedeliveryandpenaltycapped@0.2.0';

export default MiniLateDeliveryAndPenaltyCappedLogic;
