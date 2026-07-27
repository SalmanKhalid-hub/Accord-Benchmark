import { ITemplateModel, IPayment, IResult } from './generated/org.accordproject.promissorynote@0.2.0';

class PromissoryNoteLogic extends TemplateLogic<ITemplateModel> {
  // @ts-ignore
  public async trigger(data: ITemplateModel, request: IPayment): Promise<{ result: IResult }> {
    const principal = data.principal.doubleValue;
    const rate = data.interestRate;
    const startDate = data.date;
    const now = new Date();

    const msPerDay = 24 * 60 * 60 * 1000;
    const elapsedDays = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / msPerDay));

    const accruedInterest = principal * (rate / 100) * (elapsedDays / 365);
    const outstandingBalance = Math.max(0, principal + accruedInterest - request.amountPaid);

    return {
      result: {
        $class: 'org.accordproject.promissorynote@0.2.0.Result',
        $timestamp: now,
        outstandingBalance
      }
    };
  }
}

export default PromissoryNoteLogic;
