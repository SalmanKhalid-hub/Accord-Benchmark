import { ITemplateModel, IPayment, IResult } from './generated/org.accordproject.promissorynotemd@0.2.0';

class PromissoryNoteLogicBase {
  protected accrueInterest(data: ITemplateModel, asOf: Date): number {
    const principal = data.amount.doubleValue;
    const rate = data.interestRate;
    const startDate = new Date(data.date);
    const endDate = asOf < new Date(data.maturityDate) ? asOf : new Date(data.maturityDate);
    const millisPerDay = 24 * 60 * 60 * 1000;
    const days = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / millisPerDay));
    return principal * rate * (days / 365);
  }
}

// @ts-ignore
export default class PromissoryNoteLogic extends TemplateLogic<ITemplateModel> {
  public async trigger(data: ITemplateModel, request: IPayment): Promise<{ result: IResult }> {
    const paid = request.amountPaid.doubleValue;
    const interest = this.accrueInterest(data, new Date());
    const principal = data.amount.doubleValue;
    const outstanding = Math.max(0, principal + interest - paid);

    return {
      result: {
        $class: 'org.accordproject.promissorynotemd@0.2.0.Result',
        $timestamp: new Date(),
        outstandingBalance: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: outstanding,
          currencyCode: data.amount.currencyCode
        }
      }
    };
  }
}
