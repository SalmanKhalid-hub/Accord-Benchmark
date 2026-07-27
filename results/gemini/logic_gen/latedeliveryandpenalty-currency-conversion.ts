// @ts-ignore
class LateDeliveryAndPenaltyLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: ILateDeliveryAndPenaltyRequest
  ): Promise<{ result: ILateDeliveryAndPenaltyResponse }> {
    const NS = 'org.accordproject.latedeliveryandpenaltycurrencyconversion@0.2.0';
    const MONEY_NS = 'org.accordproject.money@0.3.0';

    let penaltyAmount = 0;
    let buyerMayTerminate = false;

    if (request.forceMajeure) {
      penaltyAmount = 0;
      buyerMayTerminate = false;
    } else {
      const agreedDelivery = request.agreedDelivery;
      const deliveredAt = request.deliveredAt || new Date(); // Assume delivered now if not provided

      const delayMillis = deliveredAt.getTime() - agreedDelivery.getTime();
      const delayDuration = data.penaltyDuration; // e.g., { amount: 2, unit: 'days' }

      let delayInUnits = 0;
      switch (delayDuration.unit) {
        case 'days':
          delayInUnits = delayMillis / (1000 * 60 * 60 * 24);
          break;
        case 'hours':
          delayInUnits = delayMillis / (1000 * 60 * 60);
          break;
        case 'minutes':
          delayInUnits = delayMillis / (1000 * 60);
          break;
        case 'seconds':
          delayInUnits = delayMillis / 1000;
          break;
        default:
          throw new Error(`Unsupported temporal unit: ${delayDuration.unit}`);
      }

      let numberOfDelayPeriods = 0;
      if (delayInUnits > 0) {
        // "Any fractional part of a days is to be considered a full days."
        // This applies to the penalty duration unit, not necessarily days.
        numberOfDelayPeriods = Math.ceil(delayInUnits / delayDuration.amount);
      }

      const goodsValue = request.goodsValue.doubleValue;
      const penaltyPercentage = data.penaltyPercentage;
      const capPercentage = data.capPercentage;
      const terminationDuration = data.termination;

      let calculatedPenalty = goodsValue * (penaltyPercentage / 100) * numberOfDelayPeriods;
      const maxPenalty = goodsValue * (capPercentage / 100);

      penaltyAmount = Math.min(calculatedPenalty, maxPenalty);

      // Check for termination
      let terminationDelayInUnits = 0;
      switch (terminationDuration.unit) {
        case 'days':
          terminationDelayInUnits = delayMillis / (1000 * 60 * 60 * 24);
          break;
        case 'hours':
          terminationDelayInUnits = delayMillis / (1000 * 60 * 60);
          break;
        case 'minutes':
          terminationDelayInUnits = delayMillis / (1000 * 60);
          break;
        case 'seconds':
          terminationDelayInUnits = delayMillis / 1000;
          break;
        default:
          throw new Error(`Unsupported temporal unit for termination: ${terminationDuration.unit}`);
      }

      if (terminationDelayInUnits > terminationDuration.amount) {
        buyerMayTerminate = true;
      }
    }

    // Apply currency conversion
    const fromCurrency = request.goodsValue.currencyCode; // Goods value is the source currency for penalty calculation
    const toCurrency = data.toCurrency; // Penalty payment currency

    let convertedPenaltyAmount = penaltyAmount;

    if (fromCurrency !== toCurrency) {
      if (!request.currencyConversion || request.currencyConversion.from !== fromCurrency || request.currencyConversion.to !== toCurrency) {
        throw new Error(`Missing or incorrect exchange rate for conversion from ${fromCurrency} to ${toCurrency}`);
      }
      convertedPenaltyAmount = penaltyAmount * request.currencyConversion.rate;
    }

    return {
      result: {
        $class: `${NS}.LateDeliveryAndPenaltyResponse`,
        $timestamp: new Date(),
        penalty: {
          $class: `${MONEY_NS}.MonetaryAmount`,
          doubleValue: convertedPenaltyAmount,
          currencyCode: toCurrency,
        },
        buyerMayTerminate: buyerMayTerminate,
      },
    };
  }
}

import {
  ITemplateModel,
  ILateDeliveryAndPenaltyRequest,
  ILateDeliveryAndPenaltyResponse,
} from './generated/org.accordproject.latedeliveryandpenaltycurrencyconversion@0.2.0';
import { CurrencyCode } from './generated/org.accordproject.money@0.3.0';

export default LateDeliveryAndPenaltyLogic;
