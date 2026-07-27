// @ts-ignore
class PerishableGoodsLogic extends TemplateLogic<ITemplateModel, IPerishableGoodsState> {
  async init(data: ITemplateModel): Promise<InitResponse<IPerishableGoodsState>> {
    return {
      state: {
        $class: 'org.accordproject.perishablegoods.PerishableGoodsState',
        $identifier: data.$identifier,
        payoutMade: false,
        totalPaid: 0.0,
      },
    };
  }

  async trigger(
    data: ITemplateModel,
    request: Request,
    state: IPerishableGoodsState
  ): Promise<EngineResponse> {
    switch (request.$class) {
      case 'org.accordproject.perishablegoods.ShipmentReceived':
        return this.handleShipmentReceived(data, request as IShipmentReceived, state);
      default:
        throw new Error('Unknown request type');
    }
  }

  private async handleShipmentReceived(
    data: ITemplateModel,
    request: IShipmentReceived,
    state: IPerishableGoodsState
  ): Promise<EngineResponse> {
    if (state.payoutMade) {
      throw new Error('Payment has already been made for this shipment.');
    }

    if (request.shipmentId !== data.shipmentId) {
      throw new Error(`Invalid shipment ID. Expected ${data.shipmentId}, got ${request.shipmentId}`);
    }

    let totalPrice = data.unitPrice.doubleValue * request.unitCount;
    let penalty = 0.0;
    let isLate = false;

    // Check for late arrival
    const now = new Date();
    if (now > data.dueDate) {
      isLate = true;
      // As per clause: "Shipments that arrive after 07/02/2018 are to be considered spoiled and must be arranged to be returned to or disposed of by grower at cost to grower."
      // This implies no payment for spoiled goods, so total price becomes 0.
      totalPrice = 0.0;
    }

    // Check unit count
    if (request.unitCount < data.minUnits || request.unitCount > data.maxUnits) {
      // The clause doesn't specify a penalty for unit count, only for temperature/humidity.
      // For now, we'll just proceed, but a real contract might have a different outcome.
      console.warn(`Unit count ${request.unitCount} is outside the agreed range [${data.minUnits}, ${data.maxUnits}].`);
    }

    // Check sensor readings
    for (const reading of request.sensorReadings) {
      // Temperature check
      if (reading.centigrade < data.minTemperature) {
        penalty += request.unitCount * (data.minTemperature - reading.centigrade) * data.penaltyFactor;
      } else if (reading.centigrade > data.maxTemperature) {
        penalty += request.unitCount * (reading.centigrade - data.maxTemperature) * data.penaltyFactor;
      }

      // Humidity check
      if (reading.humidity < data.minHumidity) {
        penalty += request.unitCount * (data.minHumidity - reading.humidity) * data.penaltyFactor;
      } else if (reading.humidity > data.maxHumidity) {
        penalty += request.unitCount * (reading.humidity - data.maxHumidity) * data.penaltyFactor;
      }
    }

    // Apply penalty to total price
    totalPrice = Math.max(0, totalPrice - penalty); // Ensure total price doesn't go negative

    const newTotalPaid = state.totalPaid + totalPrice;

    const priceCalculation: IPriceCalculation = {
      $class: 'org.accordproject.perishablegoods.PriceCalculation',
      totalPrice: totalPrice,
      penalty: penalty,
      currencyCode: data.unitPrice.currencyCode,
      late: isLate,
    };

    const paymentEvent: IPerishableGoodsPaymentEvent = {
      $class: 'org.accordproject.perishablegoods.PerishableGoodsPaymentEvent',
      $timestamp: new Date(),
      amount: {
        $class: 'org.accordproject.money.MonetaryAmount',
        doubleValue: totalPrice,
        currencyCode: data.unitPrice.currencyCode,
      },
      description: `Payment for shipment ${request.shipmentId}. Penalty applied: ${penalty.toFixed(2)} ${data.unitPrice.currencyCode}. Late arrival: ${isLate}.`,
      promisor: data.importer,
      promisee: data.grower,
    };

    return {
      result: priceCalculation,
      state: {
        ...state,
        payoutMade: true, // Assuming one-time payment per shipment
        totalPaid: newTotalPaid,
      },
      events: [paymentEvent],
    };
  }
}

export default PerishableGoodsLogic;
