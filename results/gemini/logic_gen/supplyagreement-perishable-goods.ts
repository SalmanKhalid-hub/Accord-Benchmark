import { ITemplateModel, IShipmentReceived, IPriceCalculation, ShipmentStatus, Unit, SensorReading } from './generated/org.accordproject.supplyagreementperishablegoods@0.2.0';
import { MonetaryAmount, CurrencyCode } from './generated/org.accordproject.money@0.3.0';

// @ts-ignore
class SupplyAgreementPerishableGoodsLogic extends TemplateLogic<ITemplateModel> {
    /**
     * The trigger function is called by the Accord Project runtime when a
     * 'ShipmentReceived' transaction is submitted.
     *
     * @param {ITemplateModel} data The clause data
     * @param {IShipmentReceived} request The incoming transaction
     * @returns {Promise<{ result: IPriceCalculation }>} The response to the transaction
     */
    async trigger(data: ITemplateModel, request: IShipmentReceived): Promise<{ result: IPriceCalculation }> {
        const now = new Date();
        let totalPrice: MonetaryAmount = {
            $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
            doubleValue: 0.0,
            currencyCode: data.unitPrice.currencyCode
        };
        let penalty: MonetaryAmount = {
            $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
            doubleValue: 0.0,
            currencyCode: data.unitPrice.currencyCode
        };
        let late: boolean = false;

        // Check for late delivery
        if (request.shipment.status === ShipmentStatus.ARRIVED && request.shipment.shipmentId === data.shipment) {
            if (now > data.dueDate) {
                late = true;
            }
        }

        // Calculate base price
        totalPrice.doubleValue = data.unitPrice.doubleValue * request.unitCount;

        // Check sensor readings for penalties
        if (request.shipment.sensorReadings) {
            for (const reading of request.shipment.sensorReadings) {
                let readingPenalty = 0.0;

                // Temperature penalty
                if (reading.centigrade < data.minTemperature) {
                    readingPenalty += (data.minTemperature - reading.centigrade) * data.penaltyFactor;
                } else if (reading.centigrade > data.maxTemperature) {
                    readingPenalty += (reading.centigrade - data.maxTemperature) * data.penaltyFactor;
                }

                // Humidity penalty
                if (reading.humidity < data.minHumidity) {
                    readingPenalty += (data.minHumidity - reading.humidity) * data.penaltyFactor;
                } else if (reading.humidity > data.maxHumidity) {
                    readingPenalty += (reading.humidity - data.maxHumidity) * data.penaltyFactor;
                }
                
                penalty.doubleValue += readingPenalty * request.unitCount;
            }
        }

        // Apply penalty to total price
        totalPrice.doubleValue -= penalty.doubleValue;

        return {
            result: {
                $class: 'org.accordproject.supplyagreementperishablegoods@0.2.0.PriceCalculation',
                $timestamp: now,
                totalPrice: totalPrice,
                penalty: penalty,
                late: late
            }
        };
    }
}

default export SupplyAgreementPerishableGoodsLogic;
