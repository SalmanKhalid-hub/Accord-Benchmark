import { ITemplateModel, ILateDeliveryAndPenaltyRequest, ILateDeliveryAndPenaltyResponse } from './generated/org.accordproject.latedeliveryandpenaltyelse@0.2.0';

export default class LateDeliveryAndPenaltyElseLogic extends TemplateLogic<ITemplateModel> {
  // @ts-ignore
  public async trigger(data: ITemplateModel, request: ILateDeliveryAndPenaltyRequest): Promise<{ result: ILateDeliveryAndPenaltyResponse }> {
    const zero = 0;
    const penaltyPercentPerPeriod = 10.5 / 100.0;
    const capPercent = 55 / 100.0;

    let penaltyAmount = zero;
    let buyerMayTerminate = false;

    if (request.forceMajeure) {
      penaltyAmount = zero;
      buyerMayTerminate = false;
    } else if (request.deliveredAt) {
      const msPerDay = 24 * 60 * 60 * 1000;
      const deliveredAt = new Date(request.deliveredAt as unknown as Date);
      const agreedDelivery = new Date(request.agreedDelivery as unknown as Date);

      const delayMs = deliveredAt.getTime() - agreedDelivery.getTime();
      const delayDays = Math.max(0, Math.ceil(delayMs / msPerDay));

      const penaltyPeriods = Math.ceil(delayDays / 2);
      const goodsValue = request.goodsValue.doubleValue;

      penaltyAmount = penaltyPeriods * penaltyPercentPerPeriod * goodsValue;
      const capAmount = capPercent * goodsValue;
      if (penaltyAmount > capAmount) {
        penaltyAmount = capAmount;
      }

      buyerMayTerminate = delayDays > 15;
    }

    return {
      result: {
        $class: 'org.accordproject.latedeliveryandpenaltyelse@0.2.0.LateDeliveryAndPenaltyResponse',
        $timestamp: new Date(),
        penalty: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: penaltyAmount,
          currencyCode: request.goodsValue.currencyCode
        },
        buyerMayTerminate
      }
    };
  }
}
