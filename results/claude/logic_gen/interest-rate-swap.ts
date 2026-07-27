import {
  ITemplateModel,
  IRateObservation,
  IResult,
  IDayCountFraction,
} from './generated/org.accordproject.isda.irs@0.2.0';

// @ts-ignore
class InterestRateSwapLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: IRateObservation
  ): Promise<{ result: IResult }> {
    // Calculate outstanding balance based on notional amount
    // For a simple IRS, the outstanding balance is typically the notional amount
    const outstandingBalance = {
      $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
      doubleValue: data.notionalAmount.doubleValue,
      currencyCode: data.notionalAmount.currencyCode,
    };

    const result: IResult = {
      $class: 'org.accordproject.isda.irs@0.2.0.Result',
      $timestamp: new Date(),
      outstandingBalance: outstandingBalance,
    };

    return { result };
  }
}

export default InterestRateSwapLogic;
