import { ITemplateModel, IDeliveryAcceptedRequest, IDeliveryAcceptedResponse } from './generated/org.accordproject.paymentupondelivery@0.2.0';

class PaymentUponDeliveryLogic extends TemplateLogic<ITemplateModel> {
  // @ts-ignore
  async trigger(data: ITemplateModel, request: IDeliveryAcceptedRequest): Promise<{ result: IDeliveryAcceptedResponse }> {
    const totalAmountValue = data.costOfGoods.doubleValue + data.deliveryFee.doubleValue;
    const totalAmount = {
      $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
      doubleValue: totalAmountValue,
      currencyCode: data.costOfGoods.currencyCode
    };

    return {
      result: {
        $class: 'org.accordproject.paymentupondelivery@0.2.0.DeliveryAcceptedResponse',
        $timestamp: new Date(),
        totalAmount
      }
    };
  }
}

export default PaymentUponDeliveryLogic;
