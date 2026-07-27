import { ITemplateModel, IPaymentRequest, IPayOut } from './generated/org.accordproject.carrentaltr@0.2.0';

export default class CarRentalLogic extends TemplateLogic<ITemplateModel> {
  // @ts-ignore
  public async trigger(data: ITemplateModel, request: IPaymentRequest): Promise<{ result: IPayOut }> {
    const amount = data.paymentClause.amount;
    return {
      result: {
        $class: 'org.accordproject.carrentaltr@0.2.0.PayOut',
        $timestamp: new Date(),
        amount: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: amount.doubleValue,
          currencyCode: amount.currencyCode
        }
      }
    };
  }
}
