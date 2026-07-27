import { ITemplateModel, IDeliveryUpdate, IPayOut, ShipmentStatus } from './generated/org.accordproject.fragilegoods@0.2.0';
import { CurrencyCode } from './generated/org.accordproject.money@0.3.0';

// @ts-ignore
class FragileGoodsLogic extends TemplateLogic<ITemplateModel> {
    /**
     * The trigger method is called by the Accord Project runtime when a new request is received.
     * @param data The clause data.
     * @param request The request, a DeliveryUpdate transaction.
     * @returns The response, a PayOut transaction.
     */
    async trigger(data: ITemplateModel, request: IDeliveryUpdate): Promise<{ result: IPayOut }> {
        let paymentAmount = data.deliveryPrice.doubleValue;
        const currencyCode = data.deliveryPrice.currencyCode;

        // Check for acceleration breaches
        for (const acceleration of request.accelerometerReadings) {
            if (acceleration < data.accelerationMin || acceleration > data.accelerationMax) {
                paymentAmount -= data.accelerationBreachPenalty.doubleValue;
            }
        }

        // Check for late delivery
        if (request.status === ShipmentStatus.ARRIVED && request.finishTime) {
            const startTime = new Date(request.startTime);
            const finishTime = new Date(request.finishTime);

            const deliveryDurationMillis = finishTime.getTime() - startTime.getTime();
            const deliveryLimitMillis = data.deliveryLimitDuration.amount * this.getUnitMultiplier(data.deliveryLimitDuration.unit);

            if (deliveryDurationMillis > deliveryLimitMillis) {
                paymentAmount -= data.lateDeliveryPenalty.doubleValue;
            }
        }

        return {
            result: {
                $class: 'org.accordproject.fragilegoods@0.2.0.PayOut',
                $timestamp: new Date(),
                paymentAmount: {
                    $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
                    doubleValue: paymentAmount,
                    currencyCode: currencyCode,
                },
            },
        };
    }

    /**
     * Helper to convert temporal units to milliseconds.
     * This is a simplified version and might need more robust handling for all TemporalUnit types.
     * @param unit The temporal unit.
     * @returns The multiplier to convert the unit amount to milliseconds.
     */
    private getUnitMultiplier(unit: string): number {
        switch (unit) {
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
            case 'MONTHS':
                return 1000 * 60 * 60 * 24 * 30; // Approximation
            case 'YEARS':
                return 1000 * 60 * 60 * 24 * 365; // Approximation
            default:
                return 0; // Should not happen with valid TemporalUnit
        }
    }
}

export default FragileGoodsLogic;
