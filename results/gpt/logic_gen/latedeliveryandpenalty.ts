import { ITemplateModel, ILateDeliveryAndPenaltyRequest, ILateDeliveryAndPenaltyResponse } from './generated/org.accordproject.latedeliveryandpenalty@0.2.0';
import { CurrencyCode } from './generated/org.accordproject.money@0.3.0';

export default class LateDeliveryAndPenaltyLogic extends TemplateLogic<ITemplateModel> {
  // @ts-ignore
  public async trigger(data: ITemplateModel, request: ILateDeliveryAndPenaltyRequest): Promise<{ result: ILateDeliveryAndPenaltyResponse }> {
    const response: ILateDeliveryAndPenaltyResponse = {
      $class: 'org.accordproject.latedeliveryandpenalty@0.2.0.LateDeliveryAndPenaltyResponse',
      $timestamp: new Date(),
      penalty: {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: 0,
        currencyCode: request.goodsValue.currencyCode
      },
      buyerMayTerminate: false
    };

    if (request.forceMajeure) {
      return { result: response };
    }

    if (!request.deliveredAt) {
      return { result: response };
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const deliveredAt = new Date(request.deliveredAt as any);
    const agreedDelivery = new Date(request.agreedDelivery as any);

    let delayDays = Math.ceil((deliveredAt.getTime() - agreedDelivery.getTime()) / msPerDay);
    if (delayDays < 0) {
      delayDays = 0;
    }

    const penaltyPeriods = Math.ceil(delayDays / 2);
    const penaltyPercent = penaltyPeriods * 0.105;
    const cappedPenaltyPercent = Math.min(penaltyPercent, 0.55);

    response.penalty = {
      $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
      doubleValue: request.goodsValue.doubleValue * cappedPenaltyPercent,
      currencyCode: request.goodsValue.currencyCode
    };

    response.buyerMayTerminate = delayDays > 15;

    return { result: response };
  }
}
