// @ts-ignore
class LateDeliveryAndPenaltyLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ILateDeliveryAndPenaltyRequest): Promise<{ result: ILateDeliveryAndPenaltyResponse }> {
    const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

    let penaltyAmount = 0;
    let buyerMayTerminate = false;

    if (request.forceMajeure || data.forceMajeure) {
      return {
        result: {
          $class: 'org.accordproject.latedeliveryandpenaltyelse@0.2.0.LateDeliveryAndPenaltyResponse',
          $timestamp: new Date(),
          penalty: {
            $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
            doubleValue: 0,
            currencyCode: request.goodsValue.currencyCode
          },
          buyerMayTerminate: false
        }
      };
    }

    if (request.deliveredAt && request.deliveredAt.getTime() > request.agreedDelivery.getTime()) {
      const delayMilliseconds = request.deliveredAt.getTime() - request.agreedDelivery.getTime();
      let delayDays = delayMilliseconds / MILLISECONDS_PER_DAY;

      // Handle fractional part based on the template model's fractionalPart unit
      if (data.fractionalPart === 'days') {
        delayDays = Math.ceil(delayDays);
      } else {
        // Default to ceiling if not explicitly 'days' or if other units are not handled
        delayDays = Math.ceil(delayDays);
      }

      const penaltyDurationDays = data.penaltyDuration.amount; // Assuming penaltyDuration is in days

      if (delayDays > 0) {
        const penaltyPeriods = Math.floor(delayDays / penaltyDurationDays);
        const penaltyRate = data.penaltyPercentage / 100;
        const capRate = data.capPercentage / 100;

        let calculatedPenalty = request.goodsValue.doubleValue * penaltyRate * penaltyPeriods;
        const maxPenalty = request.goodsValue.doubleValue * capRate;

        penaltyAmount = Math.min(calculatedPenalty, maxPenalty);
      }

      const terminationDelayDays = data.termination.amount; // Assuming termination is in days
      if (delayDays > terminationDelayDays) {
        buyerMayTerminate = true;
      }
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
        buyerMayTerminate: buyerMayTerminate
      }
    };
  }
}

import {
  ITemplateModel,
  ILateDeliveryAndPenaltyRequest,
  ILateDeliveryAndPenaltyResponse
} from './generated/org.accordproject.latedeliveryandpenaltyelse@0.2.0';

export default LateDeliveryAndPenaltyLogic;
