import { ITemplateModel, ILateDeliveryAndPenaltyRequest, ILateDeliveryAndPenaltyResponse } from './generated/org.accordproject.latedeliveryandpenaltyoptional@0.2.0';

class LateDeliveryAndPenaltyOptionalLogic extends TemplateLogic<ITemplateModel> {
  // @ts-ignore
  public async trigger(data: ITemplateModel, request: ILateDeliveryAndPenaltyRequest): Promise<{ result: ILateDeliveryAndPenaltyResponse }> {
    const goodsValue = request.goodsValue;
    const agreedDelivery = new Date(request.agreedDelivery as any);
    const deliveredAt = request.deliveredAt ? new Date(request.deliveredAt as any) : new Date();
    const penaltyDurationMs = (data.penaltyDuration as any).milliseconds ? (data.penaltyDuration as any).milliseconds : 0;
    const penaltyDurationDays = penaltyDurationMs / (24 * 60 * 60 * 1000);

    let delayDays = 0;
    if (deliveredAt.getTime() > agreedDelivery.getTime()) {
      delayDays = (deliveredAt.getTime() - agreedDelivery.getTime()) / (24 * 60 * 60 * 1000);
    }

    let forceMajeureApplies = false;
    if (request.forceMajeure && data.forceMajeure) {
      const dx = request.forceMajeure.miles - data.forceMajeure.miles;
      forceMajeureApplies = Math.abs(dx) <= 100;
    } else if (request.forceMajeure) {
      forceMajeureApplies = request.forceMajeure.miles <= 100;
    }

    let penaltyAmount = 0;
    let buyerMayTerminate = false;

    if (!forceMajeureApplies && delayDays > 0) {
      const chargeableUnits = Math.ceil(delayDays / (penaltyDurationDays > 0 ? penaltyDurationDays : 2));
      penaltyAmount = goodsValue.doubleValue * chargeableUnits * (data.penaltyPercentage / 100);

      const capAmount = goodsValue.doubleValue * (data.capPercentage / 100);
      if (penaltyAmount > capAmount) {
        penaltyAmount = capAmount;
      }

      if (delayDays > 15) {
        buyerMayTerminate = true;
      }
    }

    return {
      result: {
        $class: 'org.accordproject.latedeliveryandpenaltyoptional@0.2.0.LateDeliveryAndPenaltyResponse',
        $timestamp: new Date(),
        penalty: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: penaltyAmount,
          currencyCode: goodsValue.currencyCode
        },
        buyerMayTerminate
      }
    };
  }
}

export default LateDeliveryAndPenaltyOptionalLogic;
