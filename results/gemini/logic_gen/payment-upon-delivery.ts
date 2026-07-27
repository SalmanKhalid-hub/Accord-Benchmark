// @ts-ignore
class PaymentUponDeliveryLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IDeliveryAcceptedRequest): Promise<{ result: IDeliveryAcceptedResponse }> {
    const totalAmountValue = data.costOfGoods.doubleValue + data.deliveryFee.doubleValue;
    const currencyCode = data.costOfGoods.currencyCode; // Assuming both amounts have the same currency

    const totalAmount: IMonetaryAmount = {
      $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
      doubleValue: totalAmountValue,
      currencyCode: currencyCode,
    };

    return {
      result: {
        $class: 'org.accordproject.paymentupondelivery@0.2.0.DeliveryAcceptedResponse',
        $timestamp: new Date(),
        totalAmount: totalAmount,
      },
    };
  }
}

import {
  ITemplateModel,
  IDeliveryAcceptedRequest,
  IDeliveryAcceptedResponse,
} from './generated/org.accordproject.paymentupondelivery@0.2.0';
import {
  IMonetaryAmount,
} from './generated/org.accordproject.money@0.3.0';

export default PaymentUponDeliveryLogic;
