// @ts-ignore
class LateDeliveryAndPenaltyLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ILateDeliveryAndPenaltyRequest): Promise<{ result: ILateDeliveryAndPenaltyResponse }> {
    const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

    let penalty = 0.0;
    let buyerMayTerminate = false;

    // Check for Force Majeure
    if (request.forceMajeure && data.forceMajeure) {
      const forceMajeureDistance = request.forceMajeure.miles;
      const clauseForceMajeureDistance = data.forceMajeure.miles;
      if (forceMajeureDistance <= clauseForceMajeureDistance) {
        return {
          result: {
            $class: 'org.accordproject.latedeliveryandpenaltyoptional@0.2.0.LateDeliveryAndPenaltyResponse',
            $timestamp: new Date(),
            penalty: {
              $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
              doubleValue: 0.0,
              currencyCode: request.goodsValue.currencyCode
            },
            buyerMayTerminate: false
          }
        };
      }
    }

    const agreedDeliveryTime = request.agreedDelivery.getTime();
    const deliveredAtTime = request.deliveredAt ? request.deliveredAt.getTime() : new Date().getTime();

    if (deliveredAtTime > agreedDeliveryTime) {
      const delayMilliseconds = deliveredAtTime - agreedDeliveryTime;
      let delayDays = delayMilliseconds / MILLISECONDS_PER_DAY;

      // Handle fractional part based on fractionalPart unit
      if (data.fractionalPart === 'days') {
        delayDays = Math.ceil(delayDays);
      } else if (data.fractionalPart === 'hours') {
        const delayHours = delayMilliseconds / (1000 * 60 * 60);
        delayDays = Math.ceil(delayHours / 24);
      } else if (data.fractionalPart === 'minutes') {
        const delayMinutes = delayMilliseconds / (1000 * 60);
        delayDays = Math.ceil(delayMinutes / (24 * 60));
      } else if (data.fractionalPart === 'seconds') {
        const delaySeconds = delayMilliseconds / 1000;
        delayDays = Math.ceil(delaySeconds / (24 * 60 * 60));
      }

      const penaltyDurationDays = data.penaltyDuration.amount;
      const penaltyPercentage = data.penaltyPercentage;
      const capPercentage = data.capPercentage;
      const terminationDays = data.termination.amount;

      if (delayDays > 0) {
        const penaltyPeriods = Math.floor(delayDays / penaltyDurationDays);
        const calculatedPenalty = penaltyPeriods * (penaltyPercentage / 100) * request.goodsValue.doubleValue;
        const maxPenalty = (capPercentage / 100) * request.goodsValue.doubleValue;

        penalty = Math.min(calculatedPenalty, maxPenalty);
      }

      if (delayDays > terminationDays) {
        buyerMayTerminate = true;
      }
    }

    return {
      result: {
        $class: 'org.accordproject.latedeliveryandpenaltyoptional@0.2.0.LateDeliveryAndPenaltyResponse',
        $timestamp: new Date(),
        penalty: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: penalty,
          currencyCode: request.goodsValue.currencyCode
        },
        buyerMayTerminate: buyerMayTerminate
      }
    };
  }
}

export default LateDeliveryAndPenaltyLogic;
