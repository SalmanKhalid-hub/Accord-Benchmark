// @ts-ignore
class MiniLateDeliveryAndPenaltyPaymentLogic extends TemplateLogic<ITemplateModel> {
    async trigger(data: ITemplateModel, request: ILateRequest): Promise<{ result: ILateResponse }> {
        const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

        const agreedDeliveryTime = request.agreedDelivery.getTime();
        const deliveredAtTime = request.deliveredAt.getTime();

        const delayMilliseconds = deliveredAtTime - agreedDeliveryTime;
        const delayDays = delayMilliseconds / MILLISECONDS_PER_DAY;

        let penaltyAmount = {
            $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
            doubleValue: 0.0,
            currencyCode: request.goodsValue.currencyCode
        };
        let buyerMayTerminate = false;

        if (delayDays > 0) {
            const penaltyDurationDays = data.penaltyDuration.amount; // Assuming penaltyDuration is in days
            const penaltyPeriods = Math.floor(delayDays / penaltyDurationDays);

            let calculatedPenaltyValue = request.goodsValue.doubleValue * data.penaltyPercentage * penaltyPeriods;

            const capValue = request.goodsValue.doubleValue * data.capPercentage;

            if (calculatedPenaltyValue > capValue) {
                calculatedPenaltyValue = capValue;
            }
            penaltyAmount.doubleValue = calculatedPenaltyValue;

            if (data.maximumDelay && delayDays > data.maximumDelay.amount) { // Assuming maximumDelay is in days
                buyerMayTerminate = true;
            }
        }

        return {
            result: {
                $class: 'org.accordproject.minilatedeliveryandpenaltypayment@0.2.0.LateResponse',
                $timestamp: new Date(),
                penalty: penaltyAmount,
                buyerMayTerminate: buyerMayTerminate
            }
        };
    }
}

import {
    ITemplateModel,
    ILateRequest,
    ILateResponse,
} from './generated/org.accordproject.minilatedeliveryandpenaltypayment@0.2.0';

export default MiniLateDeliveryAndPenaltyPaymentLogic;
