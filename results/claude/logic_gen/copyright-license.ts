import {
  ITemplateModel,
  IPaymentRequest,
  IPayOut,
  IPaymentObligationEvent,
} from './generated/org.accordproject.copyrightlicense@0.2.0';

// @ts-ignore
class CopyrightLicenseLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: IPaymentRequest
  ): Promise<{ result: IPayOut }> {
    const paymentAmount = data.paymentClause.amount;

    const payOut: IPayOut = {
      $class: 'org.accordproject.copyrightlicense@0.2.0.PayOut',
      $timestamp: new Date(),
      amount: {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: paymentAmount.doubleValue,
        currencyCode: paymentAmount.currencyCode,
      },
    };

    return { result: payOut };
  }
}

export default CopyrightLicenseLogic;
