import { ITemplateModel, ILateRequest, ILateResponse } from './generated/org.accordproject.minilatedeliveryandpenaltycapped@0.2.0';

// @ts-ignore
class LateDeliveryPenaltyLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ILateRequest): Promise<{ result: ILateResponse }> {
    const agreedDelivery = new Date(request.agreedDelivery);
    const deliveredAt = new Date(request.deliveredAt);
    const goodsValue = request.goodsValue.doubleValue;
    const currencyCode = request.goodsValue.currencyCode;

    // Calculate delay in milliseconds
    const delayMs = deliveredAt.getTime() - agreedDelivery.getTime();

    // If delivery is on time or early, no penalty
    if (delayMs <= 0) {
      return {
        result: {
          $class: 'org.accordproject.minilatedeliveryandpenaltycapped@0.2.0.LateResponse',
          $timestamp: new Date(),
          penalty: {
            $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
            doubleValue: 0,
            currencyCode: currencyCode
          },
          buyerMayTerminate: false
        }
      };
    }

    // Convert penaltyDuration to milliseconds
    const penaltyDurationMs = this.durationToMs(data.penaltyDuration);

    // Calculate number of penalty periods
    const penaltyPeriods = Math.ceil(delayMs / penaltyDurationMs);

    // Calculate penalty: penaltyPercentage per period
    let penaltyAmount = (penaltyPeriods * data.penaltyPercentage / 100) * goodsValue;

    // Apply cap: penalty shall not exceed capPercentage of goods value
    const maxPenalty = (data.capPercentage / 100) * goodsValue;
    if (penaltyAmount > maxPenalty) {
      penaltyAmount = maxPenalty;
    }

    // Check if buyer may terminate: delay exceeds maximumDelay
    const maximumDelayMs = this.durationToMs(data.maximumDelay);
    const buyerMayTerminate = delayMs > maximumDelayMs;

    return {
      result: {
        $class: 'org.accordproject.minilatedeliveryandpenaltycapped@0.2.0.LateResponse',
        $timestamp: new Date(),
        penalty: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: penaltyAmount,
          currencyCode: currencyCode
        },
        buyerMayTerminate: buyerMayTerminate
      }
    };
  }

  private durationToMs(duration: any): number {
    const amount = duration.amount;
    const unit = duration.unit;

    switch (unit) {
      case 'MILLIS':
        return amount;
      case 'SECONDS':
        return amount * 1000;
      case 'MINUTES':
        return amount * 60 * 1000;
      case 'HOURS':
        return amount * 60 * 60 * 1000;
      case 'DAYS':
        return amount * 24 * 60 * 60 * 1000;
      case 'WEEKS':
        return amount * 7 * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unknown temporal unit: ${unit}`);
    }
  }
}

export default LateDeliveryPenaltyLogic;
