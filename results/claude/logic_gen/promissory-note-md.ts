import { ITemplateModel, IPayment, IResult } from './generated/org.accordproject.promissorynotemd@0.2.0';

// @ts-ignore
class PromissoryNoteLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IPayment): Promise<{ result: IResult }> {
    const amountPaid = request.amountPaid.doubleValue;
    const outstandingBalance = data.amount.doubleValue - amountPaid;

    const result: IResult = {
      $class: 'org.accordproject.promissorynotemd@0.2.0.Result',
      $timestamp: new Date(),
      outstandingBalance: {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: Math.max(0, outstandingBalance),
        currencyCode: data.amount.currencyCode,
      },
    };

    return { result };
  }
}

export default PromissoryNoteLogic;
