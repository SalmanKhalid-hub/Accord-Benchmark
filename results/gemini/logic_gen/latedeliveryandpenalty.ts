// @ts-ignore
class LateDeliveryAndPenaltyLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ILateDeliveryAndPenaltyRequest): Promise<{ result: ILateDeliveryAndPenaltyResponse }> {
    const NS = 'org.accordproject.latedeliveryandpenalty@0.2.0';
    const MONEY_NS = 'org.accordproject.money@0.3.0';

    let penaltyAmount = 0.0;
    let buyerMayTerminate = false;

    if (!request.forceMajeure) {
      const agreedDeliveryTime = request.agreedDelivery.getTime();
      const deliveredAtTime = request.deliveredAt ? request.deliveredAt.getTime() : new Date().getTime();

      if (deliveredAtTime > agreedDeliveryTime) {
        const delayMillis = deliveredAtTime - agreedDeliveryTime;
        const delayDays = delayMillis / (1000 * 60 * 60 * 24);

        let effectiveDelayDays = 0;
        if (data.fractionalPart === 'Days') {
          effectiveDelayDays = Math.ceil(delayDays);
        } else {
          // Assuming 'Days' is the only relevant unit for fractional part based on the clause
          // If other units were possible, more complex logic would be needed.
          effectiveDelayDays = Math.ceil(delayDays);
        }

        const penaltyDurationDays = data.penaltyDuration.amount; // Assuming penaltyDuration is in days

        if (effectiveDelayDays > 0) {
          const penaltyPeriods = Math.floor(effectiveDelayDays / penaltyDurationDays);
          const penaltyPercentagePerPeriod = data.penaltyPercentage;
          const capPercentage = data.capPercentage;

          let calculatedPenaltyPercentage = penaltyPeriods * penaltyPercentagePerPeriod;
          if (calculatedPenaltyPercentage > capPercentage) {
            calculatedPenaltyPercentage = capPercentage;
          }

          penaltyAmount = (calculatedPenaltyPercentage / 100.0) * request.goodsValue.doubleValue;
        }

        const terminationDelayDays = data.termination.amount; // Assuming termination is in days
        if (effectiveDelayDays > terminationDelayDays) {
          buyerMayTerminate = true;
        }
      }
    }

    return {
      result: {
        $class: `${NS}.LateDeliveryAndPenaltyResponse`,
        $timestamp: new Date(),
        penalty: {
          $class: `${MONEY_NS}.MonetaryAmount`,
          doubleValue: penaltyAmount,
          currencyCode: request.goodsValue.currencyCode,
        },
        buyerMayTerminate: buyerMayTerminate,
      },
    };
  }
}

default export LateDeliveryAndPenaltyLogic;
