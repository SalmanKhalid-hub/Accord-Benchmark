import { ITemplateModel, ILateRequest, ILateResponse } from './generated/org.accordproject.minilatedeliveryandpenaltypayment@0.2.0';

class LateDeliveryAndPenaltyLogic extends TemplateLogic<ITemplateModel> {
  // @ts-ignore
  public async trigger(data: ITemplateModel, request: ILateRequest): Promise<{ result: ILateResponse }> {
    const agreed = new Date(request.agreedDelivery as any);
    const delivered = new Date(request.deliveredAt as any);

    const msPerDay = 24 * 60 * 60 * 1000;
    const delayMs = delivered.getTime() - agreed.getTime();
    const delayDays = Math.max(0, delayMs / msPerDay);

    const penaltyDurationDays = (data.penaltyDuration as any)?.amount || 0;
    const penaltyPercentage = data.penaltyPercentage || 0;
    const capPercentage = data.capPercentage || 0;
    const maximumDelayDays = (data.maximumDelay as any)?.amount || 0;

    const periodsLate = penaltyDurationDays > 0 ? Math.floor(delayDays / penaltyDurationDays) : 0;

    const goodsValue = request.goodsValue;
    const uncappedPenalty = goodsValue.doubleValue * (penaltyPercentage / 100) * periodsLate;
    const cappedPenalty = goodsValue.doubleValue * (capPercentage / 100);
    const penaltyValue = Math.min(uncappedPenalty, cappedPenalty);

    const buyerMayTerminate = delayDays > maximumDelayDays;

    return {
      result: {
        $class: 'org.accordproject.minilatedeliveryandpenaltypayment@0.2.0.LateResponse',
        $timestamp: new Date(),
        penalty: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: penaltyValue,
          currencyCode: goodsValue.currencyCode
        },
        buyerMayTerminate
      }
    };
  }
}

export default LateDeliveryAndPenaltyLogic;
