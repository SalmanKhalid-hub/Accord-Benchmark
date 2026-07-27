import { ITemplateModel, IPayment, IResult } from './generated/org.accordproject.promissorynote@0.2.0';

// @ts-ignore
class PromissoryNoteLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IPayment): Promise<{ result: IResult }> {
    const principalAmount = data.principal.doubleValue;
    const interestRate = data.interestRate / 100;
    const amountPaid = request.amountPaid;

    const now = new Date();
    const maturityDate = new Date(data.maturityDate);
    const daysSinceIssue = Math.floor((now.getTime() - new Date(data.date).getTime()) / (1000 * 60 * 60 * 24));

    const interestAccrued = (principalAmount * interestRate * daysSinceIssue) / 365;
    const totalOutstanding = principalAmount + interestAccrued - amountPaid;
    const outstandingBalance = Math.max(0, totalOutstanding);

    return {
      result: {
        $class: 'org.accordproject.promissorynote@0.2.0.Result',
        $timestamp: new Date(),
        outstandingBalance: outstandingBalance
      }
    };
  }
}

export default PromissoryNoteLogic;
