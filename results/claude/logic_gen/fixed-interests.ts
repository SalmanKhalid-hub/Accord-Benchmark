import { ITemplateModel, IFixedInterestsRequest, IFixedInterestsResponse } from './generated/org.accordproject.fixedinterests@0.2.0';

// @ts-ignore
class FixedInterestsLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IFixedInterestsRequest): Promise<{ result: IFixedInterestsResponse }> {
    const loanAmount = data.loanAmount.doubleValue;
    const annualRate = data.rate;
    const loanDurationMonths = data.loanDuration * 12;
    
    const monthlyRate = annualRate / 100 / 12;
    
    let monthlyPayment: number;
    if (monthlyRate === 0) {
      monthlyPayment = loanAmount / loanDurationMonths;
    } else {
      monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanDurationMonths)) / 
                       (Math.pow(1 + monthlyRate, loanDurationMonths) - 1);
    }
    
    const totalPayment = monthlyPayment * loanDurationMonths;
    const totalInterest = totalPayment - loanAmount;
    
    const output = `Monthly payment: £${monthlyPayment.toFixed(2)}, Total interest: £${totalInterest.toFixed(2)}`;
    
    return {
      result: {
        $class: 'org.accordproject.fixedinterests@0.2.0.FixedInterestsResponse',
        $timestamp: new Date(),
        output: output
      }
    };
  }
}

export default FixedInterestsLogic;
