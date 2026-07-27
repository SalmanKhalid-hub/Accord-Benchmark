// @ts-ignore
class SimpleLateDeliveryAndPenaltyLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ISimpleLateDeliveryAndPenaltyRequest): Promise<{ result: ISimpleLateDeliveryAndPenaltyResponse }> {
    const agreedDelivery = request.agreedDelivery;
    const deliveredAt = request.deliveredAt || new Date(); // If not provided, assume now
    const goodsValue = request.goodsValue;

    const penaltyDuration = data.penaltyDuration;
    const penaltyPercentage = data.penaltyPercentage;
    const capPercentage = data.capPercentage;
    const maximumDelay = data.maximumDelay;

    const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day

    const delayMilliseconds = deliveredAt.getTime() - agreedDelivery.getTime();
    const delayDays = Math.max(0, Math.ceil(delayMilliseconds / oneDay));

    let penaltyAmount = 0;
    let buyerMayTerminate = false;

    // Calculate penalty based on penaltyDuration
    if (delayDays > 0) {
      let penaltyPeriodDays = 0;
      if (penaltyDuration.unit === 'DAYS') {
        penaltyPeriodDays = penaltyDuration.amount;
      } else if (penaltyDuration.unit === 'HOURS') {
        penaltyPeriodDays = penaltyDuration.amount / 24;
      } else if (penaltyDuration.unit === 'MINUTES') {
        penaltyPeriodDays = penaltyDuration.amount / (24 * 60);
      } else if (penaltyDuration.unit === 'SECONDS') {
        penaltyPeriodDays = penaltyDuration.amount / (24 * 60 * 60);
      }

      if (penaltyPeriodDays > 0) {
        const numberOfPenaltyPeriods = Math.floor(delayDays / penaltyPeriodDays);
        penaltyAmount = numberOfPenaltyPeriods * (penaltyPercentage / 100) * goodsValue.doubleValue;
      }
    }

    // Apply cap
    const maxPenalty = (capPercentage / 100) * goodsValue.doubleValue;
    penaltyAmount = Math.min(penaltyAmount, maxPenalty);

    // Check for termination right
    let maximumDelayDays = 0;
    if (maximumDelay.unit === 'DAYS') {
      maximumDelayDays = maximumDelay.amount;
    } else if (maximumDelay.unit === 'HOURS') {
      maximumDelayDays = maximumDelay.amount / 24;
    } else if (maximumDelay.unit === 'MINUTES') {
      maximumDelayDays = maximumDelay.amount / (24 * 60);
    } else if (maximumDelay.unit === 'SECONDS') {
      maximumDelayDays = maximumDelay.amount / (24 * 60 * 60);
    }

    if (delayDays > maximumDelayDays) {
      buyerMayTerminate = true;
    }

    return {
      result: {
        $class: 'org.accordproject.simplelatedeliveryandpenalty@0.2.0.SimpleLateDeliveryAndPenaltyResponse',
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

import {
  ITemplateModel,
  ISimpleLateDeliveryAndPenaltyRequest,
  ISimpleLateDeliveryAndPenaltyResponse,
} from './generated/org.accordproject.simplelatedeliveryandpenalty@0.2.0';

export default SimpleLateDeliveryAndPenaltyLogic;
