// @ts-ignore
class FixedInterestsStaticLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: IFixedInterestsStaticRequest
  ): Promise<{ result: IFixedInterestsStaticResponse }> {
    const now = new Date();

    // In a real scenario, you would perform calculations based on the loanAmount, rate, and loanDuration
    // and then compare with the provided monthlyPayment.
    // For this example, we'll just echo some information.

    const loanAmountValue = data.loanAmount.doubleValue;
    const loanAmountCurrency = data.loanAmount.currencyCode;
    const rate = data.rate;
    const loanDuration = data.loanDuration;
    const monthlyPaymentValue = data.monthlyPayment.doubleValue;
    const monthlyPaymentCurrency = data.monthlyPayment.currencyCode;

    const outputMessage = `Loan details: Amount ${loanAmountValue} ${loanAmountCurrency}, Rate ${rate}%, Duration ${loanDuration} months, Monthly Payment ${monthlyPaymentValue} ${monthlyPaymentCurrency}. Request input: ${request.input}`;

    return {
      result: {
        $class: 'org.accordproject.fixedinterestsstatic@0.2.0.FixedInterestsStaticResponse',
        $timestamp: now,
        output: outputMessage,
      },
    };
  }
}

declare var TemplateLogic: any;
import {
  ITemplateModel,
  IFixedInterestsStaticRequest,
  IFixedInterestsStaticResponse,
} from './generated/org.accordproject.fixedinterestsstatic@0.2.0';
import { CurrencyCode } from './generated/org.accordproject.money@0.3.0';

export default FixedInterestsStaticLogic;
