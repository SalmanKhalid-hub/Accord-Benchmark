import {
  ITemplateModel,
  IPaymentRequest,
  IPayOut,
} from './generated/org.accordproject.carrentaltr@0.2.0';

// @ts-ignore
class CarRentalLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: IPaymentRequest
  ): Promise<{ result: IPayOut }> {
    const paymentAmount = data.paymentClause.amount;

    const response: IPayOut = {
      $class: 'org.accordproject.carrentaltr@0.2.0.PayOut',
      $timestamp: new Date(),
      amount: {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: paymentAmount.doubleValue,
        currencyCode: paymentAmount.currencyCode,
      },
    };

    return { result: response };
  }
}

export default CarRentalLogic;
