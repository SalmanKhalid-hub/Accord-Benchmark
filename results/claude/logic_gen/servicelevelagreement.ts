import {
  ITemplateModel,
  IMonthSummary,
  IInvoiceCredit,
} from './generated/org.accordproject.servicelevelagreement@0.2.0';

// @ts-ignore
class ServiceLevelAgreementLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: IMonthSummary
  ): Promise<{ result: IInvoiceCredit }> {
    const monthlyServiceLevel = request.monthlyServiceLevel;
    const monthlyCharge = request.monthlyCharge;
    const last11MonthCredit = request.last11MonthCredit;
    const last11MonthCharge = request.last11MonthCharge;

    let monthlyCredit = {
      $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
      doubleValue: 0,
      currencyCode: monthlyCharge.currencyCode,
    };

    // Determine credit based on service level tiers
    if (monthlyServiceLevel < data.availability1) {
      monthlyCredit.doubleValue = data.serviceCredit1.doubleValue;
    } else if (monthlyServiceLevel < data.availability2) {
      monthlyCredit.doubleValue = data.serviceCredit2.doubleValue;
    }

    // Apply monthly cap (3.3): max 10% of monthly charge
    const monthlyCapAmount =
      monthlyCharge.doubleValue * (data.monthlyCapPercentage / 100);
    if (monthlyCredit.doubleValue > monthlyCapAmount) {
      monthlyCredit.doubleValue = monthlyCapAmount;
    }

    // Apply yearly cap (3.4): max 10% of last 12 months charges
    const totalCredit = last11MonthCredit.doubleValue + monthlyCredit.doubleValue;
    const yearlyCapAmount =
      (last11MonthCharge.doubleValue + monthlyCharge.doubleValue) *
      (data.yearlyCapPercentage / 100);

    if (totalCredit > yearlyCapAmount) {
      monthlyCredit.doubleValue = Math.max(
        0,
        yearlyCapAmount - last11MonthCredit.doubleValue
      );
    }

    const response: IInvoiceCredit = {
      $class: 'org.accordproject.servicelevelagreement@0.2.0.InvoiceCredit',
      $timestamp: new Date(),
      monthlyCredit: monthlyCredit,
    };

    return { result: response };
  }
}

export default ServiceLevelAgreementLogic;
