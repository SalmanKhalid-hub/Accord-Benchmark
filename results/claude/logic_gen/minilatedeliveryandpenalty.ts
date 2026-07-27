import { ITemplateModel, ILateRequest, ILateResponse } from './generated/org.accordproject.minilatedeliveryandpenalty@0.2.0';

// @ts-ignore
class LateDeliveryPenaltyLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ILateRequest): Promise<{ result: ILateResponse }> {
    const agreedDelivery = new Date(request.agreedDelivery);
    const deliveredAt = new Date(request.deliveredAt);
    
    // Calculate delay in milliseconds
    const delayMs = deliveredAt.getTime() - agreedDelivery.getTime();
    
    // Convert delay to days
    const delayDays = delayMs / (1000 * 60 * 60 * 24);
    
    // Get penalty duration in days
    const penaltyDurationDays = data.penaltyDuration.amount;
    
    // Calculate number of penalty periods
    const penaltyPeriods = Math.ceil(delayDays / penaltyDurationDays);
    
    // Calculate penalty amount
    const goodsValueAmount = request.goodsValue.doubleValue;
    const penaltyAmount = (goodsValueAmount * data.penaltyPercentage / 100) * penaltyPeriods;
    
    // Check if buyer may terminate
    const maximumDelayDays = data.maximumDelay.amount;
    const buyerMayTerminate = delayDays > maximumDelayDays;
    
    const response: ILateResponse = {
      $class: 'org.accordproject.minilatedeliveryandpenalty@0.2.0.LateResponse',
      $timestamp: new Date(),
      penalty: {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: penaltyAmount,
        currencyCode: request.goodsValue.currencyCode
      },
      buyerMayTerminate: buyerMayTerminate
    };
    
    return { result: response };
  }
}

export default LateDeliveryPenaltyLogic;
