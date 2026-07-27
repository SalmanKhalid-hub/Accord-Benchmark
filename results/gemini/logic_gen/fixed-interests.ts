// @ts-ignore
class FixedInterestsLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IFixedInterestsRequest): Promise<{ result: IFixedInterestsResponse }> {
    const principal = data.loanAmount.doubleValue;
    const annualRate = data.rate / 100;
    const loanDurationMonths = data.loanDuration * 12;

    const monthlyRate = annualRate / 12;

    // Calculate monthly payment using the fixed-rate loan formula
    const monthlyPayment =
      (principal * monthlyRate) /
      (1 - Math.pow(1 + monthlyRate, -loanDurationMonths));

    return {
      result: {
        $class: 'org.accordproject.fixedinterests@0.2.0.FixedInterestsResponse',
        $timestamp: new Date(),
        output: `The monthly payment for a loan of ${data.loanAmount.currencyCode} ${principal.toFixed(2)} at an annual rate of ${data.rate}% over ${data.loanDuration} years is ${data.loanAmount.currencyCode} ${monthlyPayment.toFixed(2)}.`,
      },
    };
  }
}

import { ITemplateModel, IFixedInterestsRequest, IFixedInterestsResponse } from './generated/org.accordproject.fixedinterests@0.2.0';
import { CurrencyCode } from './generated/org.accordproject.money@0.3.0';

export default FixedInterestsLogic;
