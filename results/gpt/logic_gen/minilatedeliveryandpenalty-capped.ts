import { ITemplateModel, ILateRequest, ILateResponse } from './generated/org.accordproject.minilatedeliveryandpenaltycapped@0.2.0';

class LateDeliveryAndPenaltyCappedLogic extends TemplateLogic<ITemplateModel> {
    async trigger(data: ITemplateModel, request: ILateRequest): Promise<{ result: ILateResponse }> {
        const msPerDay = 24 * 60 * 60 * 1000;
        const penaltyPeriodMs = (data.penaltyDuration.quantity as number) * this.durationUnitToMs(data.penaltyDuration.unit);
        const maximumDelayMs = (data.maximumDelay.quantity as number) * this.durationUnitToMs(data.maximumDelay.unit);

        const deliveredAt = new Date(request.deliveredAt as unknown as string);
        const agreedDelivery = new Date(request.agreedDelivery as unknown as string);

        const delayMs = deliveredAt.getTime() - agreedDelivery.getTime();
        const delayDays = delayMs > 0 ? delayMs / msPerDay : 0;

        let penaltyValue = 0;
        if (delayMs > 0) {
            const periods = delayMs / penaltyPeriodMs;
            penaltyValue = request.goodsValue.doubleValue * data.penaltyPercentage * periods;
            const capValue = request.goodsValue.doubleValue * data.capPercentage;
            penaltyValue = Math.min(penaltyValue, capValue);
        }

        const buyerMayTerminate = delayMs > maximumDelayMs;

        return {
            result: {
                $class: 'org.accordproject.minilatedeliveryandpenaltycapped@0.2.0.LateResponse',
                $timestamp: new Date(),
                penalty: {
                    $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
                    doubleValue: penaltyValue,
                    currencyCode: request.goodsValue.currencyCode
                },
                buyerMayTerminate
            }
        };
    }

    private durationUnitToMs(unit: any): number {
        const normalized = String(unit).toUpperCase();
        switch (normalized) {
            case 'MILLISECONDS':
                return 1;
            case 'SECONDS':
                return 1000;
            case 'MINUTES':
                return 60 * 1000;
            case 'HOURS':
                return 60 * 60 * 1000;
            case 'DAYS':
                return 24 * 60 * 60 * 1000;
            case 'WEEKS':
                return 7 * 24 * 60 * 60 * 1000;
            case 'MONTHS':
                return 30 * 24 * 60 * 60 * 1000;
            case 'YEARS':
                return 365 * 24 * 60 * 60 * 1000;
            default:
                return 0;
        }
    }
}

export default LateDeliveryAndPenaltyCappedLogic;
