import {
  ITemplateModel,
  ILateDeliveryAndPenaltyRequest,
  ILateDeliveryAndPenaltyResponse,
} from './generated/org.accordproject.latedeliveryandpenaltycurrencyconversion@0.2.0';

// @ts-ignore
class LateDeliveryAndPenaltyLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: ILateDeliveryAndPenaltyRequest
  ): Promise<{ result: ILateDeliveryAndPenaltyResponse }> {
    // If force majeure, no penalty
    if (request.forceMajeure) {
      return {
        result: {
          $class:
            'org.accordproject.latedeliveryandpenaltycurrencyconversion@0.2.0.LateDeliveryAndPenaltyResponse',
          $timestamp: new Date(),
          penalty: {
            $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
            doubleValue: 0,
            currencyCode: data.toCurrency,
          },
          buyerMayTerminate: false,
        },
      };
    }

    // Calculate delay in days
    const agreedDeliveryTime = new Date(request.agreedDelivery).getTime();
    const deliveredAtTime = request.deliveredAt
      ? new Date(request.deliveredAt).getTime()
      : new Date().getTime();

    const delayMs = deliveredAtTime - agreedDeliveryTime;
    const delayDays = Math.ceil(delayMs / (1000 * 60 * 60 * 24));

    // If no delay, no penalty
    if (delayDays <= 0) {
      return {
        result: {
          $class:
            'org.accordproject.latedeliveryandpenaltycurrencyconversion@0.2.0.LateDeliveryAndPenaltyResponse',
          $timestamp: new Date(),
          penalty: {
            $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
            doubleValue: 0,
            currencyCode: data.toCurrency,
          },
          buyerMayTerminate: false,
        },
      };
    }

    // Calculate penalty duration in days
    const penaltyDurationMs =
      data.penaltyDuration.amount *
      this.getMillisecondsPerUnit(data.penaltyDuration.unit);
    const penaltyDurationDays = penaltyDurationMs / (1000 * 60 * 60 * 24);

    // Calculate number of penalty periods
    const penaltyPeriods = Math.ceil(delayDays / penaltyDurationDays);

    // Calculate base penalty in source currency (EUR)
    const goodsValueEur = request.goodsValue.doubleValue;
    const basePenaltyEur = goodsValueEur * (data.penaltyPercentage / 100) * penaltyPeriods;

    // Apply cap
    const capAmount = goodsValueEur * (data.capPercentage / 100);
    const penaltyEur = Math.min(basePenaltyEur, capAmount);

    // Convert to target currency using exchange rate
    const exchangeRate = request.currencyConversion.rate;
    const penaltyInTargetCurrency = penaltyEur * exchangeRate;

    // Determine if buyer may terminate
    const terminationDurationMs =
      data.termination.amount *
      this.getMillisecondsPerUnit(data.termination.unit);
    const terminationDurationDays =
      terminationDurationMs / (1000 * 60 * 60 * 24);
    const buyerMayTerminate = delayDays > terminationDurationDays;

    return {
      result: {
        $class:
          'org.accordproject.latedeliveryandpenaltycurrencyconversion@0.2.0.LateDeliveryAndPenaltyResponse',
        $timestamp: new Date(),
        penalty: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: penaltyInTargetCurrency,
          currencyCode: data.toCurrency,
        },
        buyerMayTerminate,
      },
    };
  }

  private getMillisecondsPerUnit(unit: string): number {
    switch (unit.toUpperCase()) {
      case 'SECOND':
        return 1000;
      case 'MINUTE':
        return 1000 * 60;
      case 'HOUR':
        return 1000 * 60 * 60;
      case 'DAY':
        return 1000 * 60 * 60 * 24;
      case 'WEEK':
        return 1000 * 60 * 60 * 24 * 7;
      case 'MONTH':
        return 1000 * 60 * 60 * 24 * 30;
      case 'YEAR':
        return 1000 * 60 * 60 * 24 * 365;
      default:
        throw new Error(`Unknown temporal unit: ${unit}`);
    }
  }
}

export default LateDeliveryAndPenaltyLogic;
