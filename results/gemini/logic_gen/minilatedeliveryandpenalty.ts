// @ts-ignore
class LateDeliveryAndPenaltyLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ILateRequest): Promise<{ result: ILateResponse }> {
    const agreedDelivery = request.agreedDelivery;
    const deliveredAt = request.deliveredAt;
    const goodsValue = request.goodsValue;

    const penaltyDuration = data.penaltyDuration;
    const penaltyPercentage = data.penaltyPercentage;
    const maximumDelay = data.maximumDelay;

    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const delayMilliseconds = deliveredAt.getTime() - agreedDelivery.getTime();
    const delayDays = delayMilliseconds / millisecondsPerDay;

    let penaltyAmount = 0;
    let buyerMayTerminate = false;

    if (delayDays > 0) {
      const penaltyIntervalDays = penaltyDuration.amount * (penaltyDuration.unit === 'days' ? 1 : 0); // Assuming penaltyDuration.unit is 'days'
      if (penaltyIntervalDays > 0) {
        const numberOfPenaltyIntervals = Math.floor(delayDays / penaltyIntervalDays);
        penaltyAmount = goodsValue.doubleValue * (penaltyPercentage / 100) * numberOfPenaltyIntervals;
      }

      const maximumDelayDays = maximumDelay.amount * (maximumDelay.unit === 'days' ? 1 : 0); // Assuming maximumDelay.unit is 'days'
      if (delayDays > maximumDelayDays) {
        buyerMayTerminate = true;
      }
    }

    return {
      result: {
        $class: 'org.accordproject.minilatedeliveryandpenalty@0.2.0.LateResponse',
        $timestamp: new Date(),
        penalty: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: penaltyAmount,
          currencyCode: goodsValue.currencyCode,
        },
        buyerMayTerminate: buyerMayTerminate,
      },
    };
  }
}

declare class TemplateLogic<T> {
  /**
   * Define the contract logic by implementing this method
   *
   * @param data The clause data
   * @param request The request
   * @returns The response
   */
  trigger(data: T, request: any): Promise<any>;
}

import {
  ITemplateModel,
  ILateRequest,
  ILateResponse,
} from './generated/org.accordproject.minilatedeliveryandpenalty@0.2.0';

export default LateDeliveryAndPenaltyLogic;
