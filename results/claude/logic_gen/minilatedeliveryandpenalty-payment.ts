import { ITemplateModel, ILateRequest, ILateResponse } from './generated/org.accordproject.minilatedeliveryandpenaltypayment@0.2.0';

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
          $class: 'org.accordproject.minilatedeliveryandpenaltypayment@0.2.0.LateResponse',
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

    // Convert delay to days
    const delayDays = delayMs / (1000 * 60 * 60 * 24);

    // Calculate penalty duration in days
    const penaltyDurationMs = data.penaltyDuration.amount * this.getMillisecondsPerUnit(data.penaltyDuration.unit);
    const penaltyDurationDays = penaltyDurationMs / (1000 * 60 * 60 * 24);

    // Calculate number of penalty periods
    const penaltyPeriods = Math.ceil(delayDays / penaltyDurationDays);

    // Calculate penalty amount
    let penaltyAmount = (penaltyPeriods * data.penaltyPercentage / 100) * goodsValue;

    // Apply cap
    const capAmount = (data.capPercentage / 100) * goodsValue;
    if (penaltyAmount > capAmount) {
      penaltyAmount = capAmount;
    }

    // Check if buyer may terminate
    const maximumDelayMs = data.maximumDelay.amount * this.getMillisecondsPerUnit(data.maximumDelay.unit);
    const maximumDelayDays = maximumDelayMs / (1000 * 60 * 60 * 24);
    const buyerMayTerminate = delayDays > maximumDelayDays;

    return {
      result: {
        $class: 'org.accordproject.minilatedeliveryandpenaltypayment@0.2.0.LateResponse',
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

  private getMillisecondsPerUnit(unit: string): number {
    switch (unit) {
      case 'MILLIS':
        return 1;
      case 'SECONDS':
        return 1000;
      case 'MINUTES':
        return 1000 * 60;
      case 'HOURS':
        return 1000 * 60 * 60;
      case 'DAYS':
        return 1000 * 60 * 60 * 24;
      case 'WEEKS':
        return 1000 * 60 * 60 * 24 * 7;
      default:
        throw new Error(`Unknown time unit: ${unit}`);
    }
  }
}

export default LateDeliveryPenaltyLogic;
