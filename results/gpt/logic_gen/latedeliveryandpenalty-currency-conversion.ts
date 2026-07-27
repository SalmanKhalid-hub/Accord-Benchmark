import { ITemplateModel, ILateDeliveryAndPenaltyRequest, ILateDeliveryAndPenaltyResponse } from "./generated/org.accordproject.latedeliveryandpenaltycurrencyconversion@0.2.0";
import { CurrencyCode } from "./generated/org.accordproject.money@0.3.0";

function daysBetween(later: Date, earlier: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return (later.getTime() - earlier.getTime()) / msPerDay;
}

// @ts-ignore
export default class LateDeliveryAndPenaltyCurrencyConversionLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ILateDeliveryAndPenaltyRequest): Promise<{ result: ILateDeliveryAndPenaltyResponse }> {
    const zeroPenalty = {
      $class: "org.accordproject.money@0.3.0.MonetaryAmount",
      doubleValue: 0,
      currencyCode: CurrencyCode.USD
    };

    if (request.forceMajeure || data.forceMajeure) {
      return {
        result: {
          $class: "org.accordproject.latedeliveryandpenaltycurrencyconversion@0.2.0.LateDeliveryAndPenaltyResponse",
          $timestamp: new Date(),
          penalty: zeroPenalty,
          buyerMayTerminate: false
        }
      };
    }

    if (!request.deliveredAt) {
      return {
        result: {
          $class: "org.accordproject.latedeliveryandpenaltycurrencyconversion@0.2.0.LateDeliveryAndPenaltyResponse",
          $timestamp: new Date(),
          penalty: zeroPenalty,
          buyerMayTerminate: false
        }
      };
    }

    const delayDaysRaw = daysBetween(request.deliveredAt, request.agreedDelivery);
    const delayDays = Math.max(0, Math.ceil(delayDaysRaw));

    const penaltyPerPeriod = data.penaltyPercentage / 100;
    const periodsOfTwoDays = Math.floor(delayDays / 2);
    let penaltyRate = periodsOfTwoDays * penaltyPerPeriod;

    const capRate = data.capPercentage / 100;
    if (penaltyRate > capRate) {
      penaltyRate = capRate;
    }

    const sourceAmount = request.goodsValue.doubleValue;
    const sourceCurrency = request.goodsValue.currencyCode;
    const conversionRate = request.currencyConversion.rate;

    const penaltyInSourceCurrency = sourceAmount * penaltyRate;
    const convertedPenalty = penaltyInSourceCurrency * conversionRate;

    const penalty = {
      $class: "org.accordproject.money@0.3.0.MonetaryAmount",
      doubleValue: convertedPenalty,
      currencyCode: CurrencyCode.USD
    };

    const buyerMayTerminate = delayDays > 15;

    return {
      result: {
        $class: "org.accordproject.latedeliveryandpenaltycurrencyconversion@0.2.0.LateDeliveryAndPenaltyResponse",
        $timestamp: new Date(),
        penalty,
        buyerMayTerminate
      }
    };
  }
}
