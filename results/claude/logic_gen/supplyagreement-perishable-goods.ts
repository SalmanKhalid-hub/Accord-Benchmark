import {
  ITemplateModel,
  IShipmentReceived,
  IPriceCalculation,
} from './generated/org.accordproject.supplyagreementperishablegoods@0.2.0';

// @ts-ignore
class SupplyAgreementPerishableGoodsLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: IShipmentReceived
  ): Promise<{ result: IPriceCalculation }> {
    const unitCount = request.unitCount;
    const shipment = request.shipment;
    const unitPrice = data.unitPrice;
    const dueDate = data.dueDate;
    const minTemperature = data.minTemperature;
    const maxTemperature = data.maxTemperature;
    const minHumidity = data.minHumidity;
    const maxHumidity = data.maxHumidity;
    const penaltyFactor = data.penaltyFactor;

    // Calculate base price
    const basePriceValue = unitCount * unitPrice.doubleValue;

    // Check if shipment is late
    const currentDate = new Date();
    const late = currentDate > dueDate;

    // Calculate penalty based on sensor readings
    let penaltyValue = 0;

    if (shipment.sensorReadings && shipment.sensorReadings.length > 0) {
      for (const reading of shipment.sensorReadings) {
        // Check temperature breach
        if (reading.centigrade < minTemperature) {
          const tempDifference = minTemperature - reading.centigrade;
          penaltyValue +=
            unitCount * tempDifference * penaltyFactor;
        } else if (reading.centigrade > maxTemperature) {
          const tempDifference = reading.centigrade - maxTemperature;
          penaltyValue +=
            unitCount * tempDifference * penaltyFactor;
        }

        // Check humidity breach
        if (reading.humidity < minHumidity) {
          const humidityDifference = minHumidity - reading.humidity;
          penaltyValue +=
            unitCount * humidityDifference * penaltyFactor;
        } else if (reading.humidity > maxHumidity) {
          const humidityDifference = reading.humidity - maxHumidity;
          penaltyValue +=
            unitCount * humidityDifference * penaltyFactor;
        }
      }
    }

    // Calculate total price
    const totalPriceValue = basePriceValue - penaltyValue;

    const result: IPriceCalculation = {
      $class:
        'org.accordproject.supplyagreementperishablegoods@0.2.0.PriceCalculation',
      $timestamp: new Date(),
      totalPrice: {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: totalPriceValue,
        currencyCode: unitPrice.currencyCode,
      },
      penalty: {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: penaltyValue,
        currencyCode: unitPrice.currencyCode,
      },
      late: late,
    };

    return { result };
  }
}

export default SupplyAgreementPerishableGoodsLogic;
