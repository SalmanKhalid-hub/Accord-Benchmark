// @ts-ignore
class LateDeliveryAndPenaltyLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ILateDeliveryAndPenaltyRequest): Promise<{ result: ILateDeliveryAndPenaltyResponse }> {
    const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

    let penalty = 0.0;
    let buyerMayTerminate = false;

    if (request.deliveredAt && request.deliveredAt > request.agreedDelivery) {
      const delayMilliseconds = request.deliveredAt.getTime() - request.agreedDelivery.getTime();
      let delayDays = delayMilliseconds / MILLISECONDS_PER_DAY;

      // "Any fractional part of a days is to be considered a full days."
      if (data.fractionalPart === 'Days') {
        delayDays = Math.ceil(delayDays);
      }

      // "for every 2 days of delay"
      const penaltyPeriods = Math.floor(delayDays / data.penaltyDuration.amount);

      // "penalty amounting to 10.5% of the total value of the Equipment"
      const penaltyRate = data.penaltyPercentage / 100;
      const capRate = data.capPercentage / 100;

      let calculatedPenalty = penaltyPeriods * penaltyRate * request.goodsValue.doubleValue;

      // "The total amount of penalty shall not however, exceed 55% of the total value of the Equipment involved in late delivery."
      const maxPenalty = capRate * request.goodsValue.doubleValue;
      penalty = Math.min(calculatedPenalty, maxPenalty);

      // "If the delay is more than 15 days, the Buyer is entitled to terminate this Contract."
      if (delayDays > data.termination.amount) {
        buyerMayTerminate = true;
      }
    }

    return {
      result: {
        $class: 'org.accordproject.latedeliveryandpenaltyoptionalthis@0.2.0.LateDeliveryAndPenaltyResponse',
        $timestamp: new Date(),
        penalty: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: penalty,
          currencyCode: request.goodsValue.currencyCode,
        },
        buyerMayTerminate: buyerMayTerminate,
      },
    };
  }
}

export default LateDeliveryAndPenaltyLogic;
