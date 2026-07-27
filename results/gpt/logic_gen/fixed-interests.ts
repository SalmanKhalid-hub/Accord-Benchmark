import { ITemplateModel, IFixedInterestsRequest, IFixedInterestsResponse } from './generated/org.accordproject.fixedinterests@0.2.0';


// @ts-ignore
class FixedInterestsLogic extends TemplateLogic<ITemplateModel> {
    async trigger(data: ITemplateModel, request: IFixedInterestsRequest): Promise<{ result: { [key: string]: any } }> {
        const loanAmount = data.loanAmount.doubleValue;
        const annualRate = data.rate;
        const loanDurationYears = data.loanDuration;

        const monthlyRate = annualRate / 100 / 12;
        const numberOfPayments = loanDurationYears * 12;

        const monthlyPayment =
            monthlyRate === 0
                ? loanAmount / numberOfPayments
                : (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numberOfPayments));

        const response: IFixedInterestsResponse = {
            $class: 'org.accordproject.fixedinterests@0.2.0.FixedInterestsResponse',
            $timestamp: new Date(),
            output: monthlyPayment.toFixed(2)
        };

        return { result: response };
    }
}

export default FixedInterestsLogic;
