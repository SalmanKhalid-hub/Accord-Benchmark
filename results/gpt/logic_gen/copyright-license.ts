import { ITemplateModel, IPaymentRequest, IPayOut } from './generated/org.accordproject.copyrightlicense@0.2.0';


// @ts-ignore
export default class CopyrightLicenseLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IPaymentRequest): Promise<{ result: IPayOut }> {
    const amount = data.paymentClause.amount;
    return {
      result: {
        $class: 'org.accordproject.copyrightlicense@0.2.0.PayOut',
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
