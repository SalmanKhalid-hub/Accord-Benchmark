import { ITemplateModel } from './generated/org.accordproject.supplyagreementperishablegoods@0.2.0';
import { IShipmentReceived } from './generated/org.accordproject.supplyagreementperishablegoods@0.2.0';
import { IPriceCalculation } from './generated/org.accordproject.supplyagreementperishablegoods@0.2.0';
import { CurrencyCode } from './generated/org.accordproject.money@0.3.0';

// @ts-ignore
export default class SupplyAgreementPerishableGoodsLogic extends TemplateLogic<ITemplateModel> {
  public async trigger(data: ITemplateModel, request: IShipmentReceived): Promise<{ result: IPriceCalculation }> {
    const unitCount = request.unitCount || 0;
    const unitPrice = data.unitPrice;
    const baseTotal = unitCount * unitPrice.doubleValue;

    let penaltyValue = 0;

    const readings = request.shipment && request.shipment.sensorReadings ? request.shipment.sensorReadings : [];
    for (const reading of readings) {
      let tempDiff = 0;
      if (reading.centigrade < data.minTemperature) {
        tempDiff = data.minTemperature - reading.centigrade;
      } else if (reading.centigrade > data.maxTemperature) {
        tempDiff = reading.centigrade - data.maxTemperature;
      }

      let humidityDiff = 0;
      if (reading.humidity < data.minHumidity) {
        humidityDiff = data.minHumidity - reading.humidity;
      } else if (reading.humidity > data.maxHumidity) {
        humidityDiff = reading.humidity - data.maxHumidity;
      }

      penaltyValue += unitCount * data.penaltyFactor * (tempDiff + humidityDiff);
    }

    const penalty = {
      $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
      doubleValue: penaltyValue,
      currencyCode: unitPrice.currencyCode
    };

    const totalPrice = {
      $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
      doubleValue: baseTotal - penaltyValue,
      currencyCode: unitPrice.currencyCode
    };

    return {
      result: {
        $class: 'org.accordproject.supplyagreementperishablegoods@0.2.0.PriceCalculation',
        $timestamp: new Date(),
        totalPrice,
        penalty,
        late: false
      }
    };
  }
}
