import { ITemplateModel, IMonthSummary, IInvoiceCredit } from './generated/org.accordproject.servicelevelagreement@0.2.0';

class ServiceLevelAgreementLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IMonthSummary): Promise<{ result: IInvoiceCredit }> {
    const monthlyCharge = request.monthlyCharge.doubleValue;
    const last11MonthCharge = request.last11MonthCharge.doubleValue;
    const last11MonthCredit = request.last11MonthCredit.doubleValue;

    const monthlyCap = monthlyCharge * data.monthlyCapPercentage;
    const yearlyCap = last11MonthCharge * data.yearlyCapPercentage;

    let credit = 0;

    if (request.monthlyServiceLevel < data.availability2) {
      credit = data.serviceCredit2.doubleValue;
    } else if (request.monthlyServiceLevel < data.availability1) {
      credit = data.serviceCredit1.doubleValue;
    }

    const remainingMonthlyCap = Math.max(0, monthlyCap);
    const remainingYearlyCap = Math.max(0, yearlyCap - last11MonthCredit);

    const cappedCredit = Math.min(credit, remainingMonthlyCap, remainingYearlyCap);

    return {
      result: {
        $class: 'org.accordproject.servicelevelagreement@0.2.0.InvoiceCredit',
        $timestamp: new Date(),
        monthlyCredit: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: cappedCredit,
          currencyCode: request.monthlyCharge.currencyCode
        }
      }
    };
  }
}

export default ServiceLevelAgreementLogic;
