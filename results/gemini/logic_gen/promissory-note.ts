// @ts-ignore
class PromissoryNoteLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IPayment): Promise<{ result: IResult }> {
    const principal = data.principal.doubleValue;
    const interestRate = data.interestRate;
    const maturityDate = data.maturityDate;
    const amountPaid = request.amountPaid;

    // Calculate days between today and maturity date (for simplicity, assuming trigger is on payment day)
    const today = new Date();
    const diffTime = Math.abs(maturityDate.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Calculate accrued interest (simple interest for demonstration)
    // This is a simplified calculation. A real-world scenario would need to track payments and principal reduction.
    const accruedInterest = principal * (interestRate / 100) * (diffDays / 365);

    const totalDue = principal + accruedInterest;
    const outstandingBalance = totalDue - amountPaid;

    return {
      result: {
        $class: 'org.accordproject.promissorynote@0.2.0.Result',
        $timestamp: new Date(),
        outstandingBalance: outstandingBalance,
      },
    };
  }
}

default export PromissoryNoteLogic;
