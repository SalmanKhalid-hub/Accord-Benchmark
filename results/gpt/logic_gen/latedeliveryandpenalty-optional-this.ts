// @ts-ignore
class LateDeliveryAndPenaltyLogic extends TemplateLogic<ITemplateModel> {
  public async trigger(data: ITemplateModel, request: ILateDeliveryAndPenaltyRequest): Promise<{ result: ILateDeliveryAndPenaltyResponse }> {
    const agreedDelivery = new Date(request.agreedDelivery as any);
    const deliveredAt = request.deliveredAt ? new Date(request.deliveredAt as any) : new Date();
    const msPerDay = 24 * 60 * 60 * 1000;

    let penaltyAmount = 0;
    let buyerMayTerminate = false;

    const forceMajeureThreshold = request.forceMajeure !== undefined ? request.forceMajeure : data.forceMajeure;
    const isForceMajeure = forceMajeureThreshold !== undefined && forceMajeureThreshold !== null && forceMajeureThreshold > 100;

    if (!isForceMajeure && deliveredAt.getTime() > agreedDelivery.getTime()) {
      const delayDays = Math.ceil((deliveredAt.getTime() - agreedDelivery.getTime()) / msPerDay);

      if (delayDays > 0) {
        const periodsOfTwoDays = Math.ceil(delayDays / 2);
        penaltyAmount = request.goodsValue.doubleValue * periodsOfTwoDays * 0.105;

        const cap = request.goodsValue.doubleValue * 0.55;
        if (penaltyAmount > cap) {
          penaltyAmount = cap;
        }

        if (delayDays > 15) {
          buyerMayTerminate = true;
        }
      }
    }

    return {
      result: {
        $class: 'org.accordproject.latedeliveryandpenaltyoptionalthis@0.2.0.LateDeliveryAndPenaltyResponse',
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

export default LateDeliveryAndPenaltyLogic;
