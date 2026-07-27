import { ITemplateModel, IDeliveryAcceptedRequest, IDeliveryAcceptedResponse } from './generated/org.accordproject.paymentupondelivery@0.2.0';

// @ts-ignore
class PaymentUponDeliveryLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IDeliveryAcceptedRequest): Promise<{ result: IDeliveryAcceptedResponse }> {
    const costOfGoods = data.costOfGoods;
    const deliveryFee = data.deliveryFee;

    const totalAmount = {
      $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
      doubleValue: costOfGoods.doubleValue + deliveryFee.doubleValue,
      currencyCode: costOfGoods.currencyCode
    };

    const response: IDeliveryAcceptedResponse = {
      $class: 'org.accordproject.paymentupondelivery@0.2.0.DeliveryAcceptedResponse',
      $timestamp: new Date(),
      totalAmount: totalAmount
    };

    return { result: response };
  }
}

export default PaymentUponDeliveryLogic;
