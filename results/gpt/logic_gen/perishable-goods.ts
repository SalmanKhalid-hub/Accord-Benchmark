import { ITemplateModel, IShipmentReceived, IPriceCalculation, IPerishableGoodsState, IPerishableGoodsPaymentEvent } from "./generated/org.accordproject.perishablegoods@0.2.0";

class PerishableGoodsLogic extends TemplateLogic<ITemplateModel, IPerishableGoodsState> {
  public async init(data: ITemplateModel): Promise<InitResponse<IPerishableGoodsState>> {
    return {
      state: {
        $class: "org.accordproject.perishablegoods@0.2.0.PerishableGoodsState",
        $identifier: data.$identifier,
        payoutMade: false,
        totalPaid: 0.0
      }
    };
  }

  public async trigger(data: ITemplateModel, request: IShipmentReceived, state: IPerishableGoodsState): Promise<EngineResponse<IPriceCalculation, IPerishableGoodsState, IPerishableGoodsPaymentEvent>> {
    if (request.$class !== "org.accordproject.perishablegoods@0.2.0.ShipmentReceived") {
      throw new Error(`Unsupported request type: ${request.$class}`);
    }

    if (state.payoutMade) {
      throw new Error("Payment has already been made for this contract");
    }

    if (request.shipmentId !== data.shipmentId) {
      throw new Error(`Invalid shipment id: expected ${data.shipmentId} but got ${request.shipmentId}`);
    }

    if (request.unitCount < data.minUnits || request.unitCount > data.maxUnits) {
      throw new Error(`Shipment unit count must be between ${data.minUnits} and ${data.maxUnits}`);
    }

    let penalty = 0.0;
    const unitPrice = data.unitPrice.doubleValue;
    const totalPrice = request.unitCount * unitPrice;
    const lowerTemp = data.minTemperature;
    const upperTemp = data.maxTemperature;
    const lowerHumidity = data.minHumidity;
    const upperHumidity = data.maxHumidity;

    for (const reading of request.sensorReadings || []) {
      if (reading.centigrade < lowerTemp) {
        penalty += request.unitCount * (lowerTemp - reading.centigrade) * data.penaltyFactor;
      } else if (reading.centigrade > upperTemp) {
        penalty += request.unitCount * (reading.centigrade - upperTemp) * data.penaltyFactor;
      }

      if (reading.humidity < lowerHumidity) {
        penalty += request.unitCount * (lowerHumidity - reading.humidity) * data.penaltyFactor;
      } else if (reading.humidity > upperHumidity) {
        penalty += request.unitCount * (reading.humidity - upperHumidity) * data.penaltyFactor;
      }
    }

    const late = false;
    const payable = totalPrice - penalty;
    const newState: IPerishableGoodsState = {
      $class: "org.accordproject.perishablegoods@0.2.0.PerishableGoodsState",
      $identifier: state.$identifier,
      payoutMade: true,
      totalPaid: payable
    };

    const event: IPerishableGoodsPaymentEvent = {
      $class: "org.accordproject.perishablegoods@0.2.0.PerishableGoodsPaymentEvent",
      totalPrice: payable,
      currencyCode: data.unitPrice.currencyCode,
      description: `Payment due for shipment ${request.shipmentId}`
    };

    return {
      result: {
        $class: "org.accordproject.perishablegoods@0.2.0.PriceCalculation",
        totalPrice: payable,
        penalty: penalty,
        currencyCode: data.unitPrice.currencyCode,
        late: late
      },
      state: newState,
      events: [event]
    };
  }
}

export default PerishableGoodsLogic;
