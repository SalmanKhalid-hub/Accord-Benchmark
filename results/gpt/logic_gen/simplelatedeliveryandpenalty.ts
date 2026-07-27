import { ITemplateModel, ISimpleLateDeliveryAndPenaltyRequest, ISimpleLateDeliveryAndPenaltyResponse } from './generated/org.accordproject.simplelatedeliveryandpenalty@0.2.0';
import { CurrencyCode } from './generated/org.accordproject.money@0.3.0';

class LateDeliveryAndPenaltyLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ISimpleLateDeliveryAndPenaltyRequest): Promise<{ result: ISimpleLateDeliveryAndPenaltyResponse }> {
    const goodsValue = request.goodsValue;
    const agreedDelivery = request.agreedDelivery;
    const deliveredAt = request.deliveredAt;

    let penaltyAmount = 0;
    let buyerMayTerminate = false;

    if (deliveredAt) {
      const diffMs = deliveredAt.getTime() - agreedDelivery.getTime();
      const delayMs = Math.max(0, diffMs);
      const daysLate = delayMs / (1000 * 60 * 60 * 24);

      if (daysLate > 0) {
        const penaltyPeriods = Math.floor(daysLate / data.penaltyDuration.amount);
        penaltyAmount = goodsValue.doubleValue * data.penaltyPercentage * penaltyPeriods;

        const capAmount = goodsValue.doubleValue * data.capPercentage;
        penaltyAmount = Math.min(penaltyAmount, capAmount);

        buyerMayTerminate = daysLate > data.maximumDelay.amount;
      }
    }

    return {
      result: {
        $class: 'org.accordproject.simplelatedeliveryandpenalty@0.2.0.SimpleLateDeliveryAndPenaltyResponse',
        $timestamp: new Date(),
        penalty: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: penaltyAmount,
          currencyCode: goodsValue.currencyCode as CurrencyCode
        },
        buyerMayTerminate
      }
    };
  }
}

export default LateDeliveryAndPenaltyLogic;
