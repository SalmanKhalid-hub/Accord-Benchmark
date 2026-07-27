import {
  ITemplateModel,
  IDeliveryUpdate,
  IPayOut,
  ShipmentStatus,
} from './generated/org.accordproject.fragilegoods@0.2.0';

// @ts-ignore
class FragileGoodsLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: IDeliveryUpdate
  ): Promise<{ result: IPayOut }> {
    let paymentAmount = data.deliveryPrice.doubleValue;
    const currencyCode = data.deliveryPrice.currencyCode;

    // Check for late delivery
    if (request.status === ShipmentStatus.ARRIVED && request.finishTime) {
      const deliveryLimitMs =
        data.deliveryLimitDuration.amount *
        this.getMillisecondsPerUnit(data.deliveryLimitDuration.unit);
      const actualDeliveryTimeMs =
        request.finishTime.getTime() - request.startTime.getTime();

      if (actualDeliveryTimeMs > deliveryLimitMs) {
        paymentAmount -= data.lateDeliveryPenalty.doubleValue;
      }
    }

    // Check for acceleration breaches
    if (request.accelerometerReadings && request.accelerometerReadings.length > 0) {
      const breachCount = request.accelerometerReadings.filter(
        (reading) =>
          reading < data.accelerationMin || reading > data.accelerationMax
      ).length;

      if (breachCount > 0) {
        paymentAmount -=
          breachCount * data.accelerationBreachPenalty.doubleValue;
      }
    }

    // Ensure payment amount doesn't go below zero
    paymentAmount = Math.max(0, paymentAmount);

    const result: IPayOut = {
      $class: 'org.accordproject.fragilegoods@0.2.0.PayOut',
      $timestamp: new Date(),
      paymentAmount: {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: paymentAmount,
        currencyCode: currencyCode,
      },
    };

    return { result };
  }

  private getMillisecondsPerUnit(unit: string): number {
    switch (unit.toUpperCase()) {
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
      default:
        return 1;
    }
  }
}

export default FragileGoodsLogic;
