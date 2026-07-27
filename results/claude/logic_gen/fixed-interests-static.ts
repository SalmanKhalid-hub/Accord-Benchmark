import {
  ITemplateModel,
  IFixedInterestsStaticRequest,
  IFixedInterestsStaticResponse,
} from './generated/org.accordproject.fixedinterestsstatic@0.2.0';

// @ts-ignore
class FixedInterestsStaticLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: IFixedInterestsStaticRequest
  ): Promise<{ result: IFixedInterestsStaticResponse }> {
    const loanAmount = data.loanAmount.doubleValue;
    const rate = data.rate;
    const loanDuration = data.loanDuration;
    const monthlyPayment = data.monthlyPayment.doubleValue;
    const currencyCode = data.loanAmount.currencyCode;

    const monthlyRate = rate / 100 / 12;
    const numberOfPayments = loanDuration * 12;

    const totalPayment = monthlyPayment * numberOfPayments;
    const totalInterest = totalPayment - loanAmount;

    const output = `Loan Amount: ${loanAmount} ${currencyCode}, Annual Interest Rate: ${rate}%, Loan Duration: ${loanDuration} years, Monthly Payment: ${monthlyPayment} ${currencyCode}, Total Interest Paid: ${totalInterest.toFixed(2)} ${currencyCode}`;

    return {
      result: {
        $class: 'org.accordproject.fixedinterestsstatic@0.2.0.FixedInterestsStaticResponse',
        $timestamp: new Date(),
        output: output,
      },
    };
  }
}

export default FixedInterestsStaticLogic;
