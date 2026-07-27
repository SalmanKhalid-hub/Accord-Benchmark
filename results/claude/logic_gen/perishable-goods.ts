import {
  ITemplateModel,
  IShipmentReceived,
  IPriceCalculation,
  IPerishableGoodsPaymentEvent,
  IPerishableGoodsState,
  ISensorReading,
} from './generated/org.accordproject.perishablegoods@0.2.0';

// @ts-ignore
class PerishableGoodsLogic extends TemplateLogic<ITemplateModel, IPerishableGoodsState> {
  async init(data: ITemplateModel): Promise<InitResponse<IPerishableGoodsState>> {
    return {
      state: {
        $class: 'org.accordproject.perishablegoods@0.2.0.PerishableGoodsState',
        $identifier: data.$identifier,
        status: 'AWAITING_SHIPMENT',
        payoutMade: false,
        totalPaid: 0.0,
      },
    };
  }

  async trigger(
    data: ITemplateModel,
    request: IShipmentReceived,
    state: IPerishableGoodsState
  ): Promise<EngineResponse<IPerishableGoodsState>> {
    if (request.$class === 'org.accordproject.perishablegoods@0.2.0.ShipmentReceived') {
      const shipmentRequest = request as IShipmentReceived;

      // Validate state transition
      if (state.status !== 'AWAITING_SHIPMENT') {
        throw new Error(`Cannot receive shipment in state ${state.status}`);
      }

      // Validate shipment ID
      if (shipmentRequest.shipmentId !== data.shipmentId) {
        throw new Error(`Shipment ID mismatch: expected ${data.shipmentId}, got ${shipmentRequest.shipmentId}`);
      }

      // Validate unit count
      if (shipmentRequest.unitCount < data.minUnits || shipmentRequest.unitCount > data.maxUnits) {
        throw new Error(
          `Unit count ${shipmentRequest.unitCount} outside range [${data.minUnits}, ${data.maxUnits}]`
        );
      }

      // Check if shipment is late
      const now = new Date();
      const isLate = now > data.dueDate;

      // Calculate penalty for temperature and humidity breaches
      let totalPenalty = 0.0;
      let hasBreaches = false;

      if (shipmentRequest.sensorReadings && shipmentRequest.sensorReadings.length > 0) {
        for (const reading of shipmentRequest.sensorReadings) {
          let readingPenalty = 0.0;

          // Check temperature breach
          if (reading.centigrade < data.minTemperature) {
            const diff = data.minTemperature - reading.centigrade;
            readingPenalty += shipmentRequest.unitCount * diff * data.penaltyFactor;
            hasBreaches = true;
          } else if (reading.centigrade > data.maxTemperature) {
            const diff = reading.centigrade - data.maxTemperature;
            readingPenalty += shipmentRequest.unitCount * diff * data.penaltyFactor;
            hasBreaches = true;
          }

          // Check humidity breach
          if (reading.humidity < data.minHumidity) {
            const diff = data.minHumidity - reading.humidity;
            readingPenalty += shipmentRequest.unitCount * diff * data.penaltyFactor;
            hasBreaches = true;
          } else if (reading.humidity > data.maxHumidity) {
            const diff = reading.humidity - data.maxHumidity;
            readingPenalty += shipmentRequest.unitCount * diff * data.penaltyFactor;
            hasBreaches = true;
          }

          totalPenalty += readingPenalty;
        }
      }

      // Calculate base price
      const basePrice = shipmentRequest.unitCount * data.unitPrice.doubleValue;

      // Apply penalty
      const totalPrice = Math.max(0, basePrice - totalPenalty);

      // Determine new status
      let newStatus = 'SHIPMENT_RECEIVED';
      if (isLate) {
        newStatus = 'SHIPMENT_SPOILED';
      } else if (hasBreaches) {
        newStatus = 'SHIPMENT_RECEIVED_WITH_BREACH';
      }

      // Create payment event
      const paymentEvent: IPerishableGoodsPaymentEvent = {
        $class: 'org.accordproject.perishablegoods@0.2.0.PerishableGoodsPaymentEvent',
        $identifier: `${data.$identifier}-payment-${Date.now()}`,
        $timestamp: new Date(),
        totalPrice: totalPrice,
        currencyCode: data.unitPrice.currencyCode,
        description: `Payment for shipment ${shipmentRequest.shipmentId}`,
        status: 'PENDING',
      };

      // Create price calculation response
      const priceCalculation: IPriceCalculation = {
        $class: 'org.accordproject.perishablegoods@0.2.0.PriceCalculation',
        $identifier: `${data.$identifier}-price-${Date.now()}`,
        $timestamp: new Date(),
        totalPrice: totalPrice,
        penalty: totalPenalty,
        currencyCode: data.unitPrice.currencyCode,
        late: isLate,
      };

      // Update state
      const newState: IPerishableGoodsState = {
        ...state,
        status: newStatus,
        totalPaid: totalPrice,
        payoutMade: false,
      };

      return {
        result: priceCalculation,
        state: newState,
        events: [paymentEvent],
      };
    }

    throw new Error(`Unknown request type: ${request.$class}`);
  }
}

export default PerishableGoodsLogic;
