import { ITemplateModel } from './generated/org.accordproject.fragilegoods@0.2.0';
import { IDeliveryUpdate } from './generated/org.accordproject.fragilegoods@0.2.0';
import { IPayOut } from './generated/org.accordproject.fragilegoods@0.2.0';

class FragileGoodsLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IDeliveryUpdate): Promise<{ result: IPayOut }> {
    const deliveryPrice = data.deliveryPrice.doubleValue;
    const accelerationPenalty = data.accelerationBreachPenalty.doubleValue;
    const latePenalty = data.lateDeliveryPenalty.doubleValue;

    let payment = deliveryPrice;

    const outOfBoundsReadings = (request.accelerometerReadings || []).filter(
      (reading: number) => reading < data.accelerationMin || reading > data.accelerationMax
    ).length;

    payment -= outOfBoundsReadings * accelerationPenalty;

    const startTime = new Date(request.startTime);
    const finishTime = request.finishTime ? new Date(request.finishTime) : new Date();
    const elapsedMs = finishTime.getTime() - startTime.getTime();
    const deliveryLimitMs = data.deliveryLimitDuration.unit === 'seconds'
      ? data.deliveryLimitDuration.amount * 1000
      : data.deliveryLimitDuration.unit === 'milliseconds'
      ? data.deliveryLimitDuration.amount
      : data.deliveryLimitDuration.unit === 'minutes'
      ? data.deliveryLimitDuration.amount * 60 * 1000
      : data.deliveryLimitDuration.unit === 'hours'
      ? data.deliveryLimitDuration.amount * 60 * 60 * 1000
      : data.deliveryLimitDuration.unit === 'days'
      ? data.deliveryLimitDuration.amount * 24 * 60 * 60 * 1000
      : data.deliveryLimitDuration.amount * 1000;

    if (request.status === 'ARRIVED' && elapsedMs > deliveryLimitMs) {
      payment -= latePenalty;
    }

    if (payment < 0) {
      payment = 0;
    }

    return {
      result: {
        $class: 'org.accordproject.fragilegoods@0.2.0.PayOut',
        $timestamp: new Date(),
        paymentAmount: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: payment,
          currencyCode: data.deliveryPrice.currencyCode
        }
      }
    };
  }
}

export default FragileGoodsLogic;
