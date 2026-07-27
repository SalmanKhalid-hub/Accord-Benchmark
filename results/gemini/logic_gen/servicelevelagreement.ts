// @ts-ignore
class ServiceLevelAgreementLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IMonthSummary): Promise<{ result: IInvoiceCredit }> {
    let monthlyCreditValue = 0.0;

    if (request.monthlyServiceLevel < data.availability1) {
      monthlyCreditValue = data.serviceCredit1.doubleValue;
    } else if (request.monthlyServiceLevel < data.availability2) {
      monthlyCreditValue = data.serviceCredit2.doubleValue;
    }

    // Apply monthly cap
    const monthlyChargeValue = request.monthlyCharge.doubleValue;
    const monthlyCap = monthlyChargeValue * data.monthlyCapPercentage;
    if (monthlyCreditValue > monthlyCap) {
      monthlyCreditValue = monthlyCap;
    }

    // Apply yearly cap
    const last11MonthCreditValue = request.last11MonthCredit.doubleValue;
    const last11MonthChargeValue = request.last11MonthCharge.doubleValue;
    const totalCharge = monthlyChargeValue + last11MonthChargeValue;
    const yearlyCap = totalCharge * data.yearlyCapPercentage;
    const totalCredit = monthlyCreditValue + last11MonthCreditValue;

    if (totalCredit > yearlyCap) {
      monthlyCreditValue = yearlyCap - last11MonthCreditValue;
      if (monthlyCreditValue < 0) {
        monthlyCreditValue = 0;
      }
    }

    return {
      result: {
        $class: 'org.accordproject.servicelevelagreement@0.2.0.InvoiceCredit',
        $timestamp: new Date(),
        monthlyCredit: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: monthlyCreditValue,
          currencyCode: request.monthlyCharge.currencyCode,
        },
      },
    };
  }
}

import {
  ITemplateModel,
  IMonthSummary,
  IInvoiceCredit,
} from './generated/org.accordproject.servicelevelagreement@0.2.0';

export default ServiceLevelAgreementLogic;
