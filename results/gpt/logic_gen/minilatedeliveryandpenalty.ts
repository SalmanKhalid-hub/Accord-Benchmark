import { ITemplateModel, ILateRequest, ILateResponse } from './generated/org.accordproject.minilatedeliveryandpenalty@0.2.0';

class LateDeliveryAndPenaltyLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ILateRequest): Promise<{ result: ILateResponse }> {
    const agreed = new Date(request.agreedDelivery as any);
    const delivered = new Date(request.deliveredAt as any);

    const msPerDay = 24 * 60 * 60 * 1000;
    const delayMs = delivered.getTime() - agreed.getTime();
    const delayDays = Math.max(0, delayMs / msPerDay);

    const penaltyDuration: any = data.penaltyDuration as any;
    const unit = penaltyDuration.unit;
    const amount = penaltyDuration.amount;

    let daysPerPenaltyPeriod = 0;
    switch (unit) {
      case 'days':
      case 'day':
        daysPerPenaltyPeriod = amount;
        break;
      case 'hours':
      case 'hour':
        daysPerPenaltyPeriod = amount / 24;
        break;
      case 'minutes':
      case 'minute':
        daysPerPenaltyPeriod = amount / (24 * 60);
        break;
      case 'seconds':
      case 'second':
        daysPerPenaltyPeriod = amount / (24 * 60 * 60);
        break;
      case 'weeks':
      case 'week':
        daysPerPenaltyPeriod = amount * 7;
        break;
      default:
        daysPerPenaltyPeriod = amount;
    }

    const periods = daysPerPenaltyPeriod > 0 ? Math.floor(delayDays / daysPerPenaltyPeriod) : 0;
    const penaltyPercentage = (data.penaltyPercentage || 0) * periods;
    const penaltyAmount = request.goodsValue.doubleValue * penaltyPercentage / 100;

    let maxDelayDays = 15;
    const maximumDelay: any = data.maximumDelay as any;
    if (maximumDelay) {
      switch (maximumDelay.unit) {
        case 'days':
        case 'day':
          maxDelayDays = maximumDelay.amount;
          break;
        case 'hours':
        case 'hour':
          maxDelayDays = maximumDelay.amount / 24;
          break;
        case 'minutes':
        case 'minute':
          maxDelayDays = maximumDelay.amount / (24 * 60);
          break;
        case 'seconds':
        case 'second':
          maxDelayDays = maximumDelay.amount / (24 * 60 * 60);
          break;
        case 'weeks':
        case 'week':
          maxDelayDays = maximumDelay.amount * 7;
          break;
        default:
          maxDelayDays = maximumDelay.amount;
      }
    }

    return {
      result: {
        $class: 'org.accordproject.minilatedeliveryandpenalty@0.2.0.LateResponse',
        $timestamp: new Date(),
        penalty: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: penaltyAmount,
          currencyCode: request.goodsValue.currencyCode
        },
        buyerMayTerminate: delayDays > maxDelayDays
      }
    };
  }
}

export default LateDeliveryAndPenaltyLogic;
