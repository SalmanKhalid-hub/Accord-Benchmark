import { ITemplateModel, IRateObservation, IResult } from './generated/org.accordproject.isda.irs@0.2.0';

// @ts-ignore
class ISDAInterestRateSwapLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IRateObservation): Promise<{ result: IResult }> {
    return {
      result: {
        $class: 'org.accordproject.isda.irs@0.2.0.Result',
        $timestamp: new Date(),
        outstandingBalance: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: data.notionalAmount.doubleValue,
          currencyCode: data.notionalAmount.currencyCode
        }
      }
    };
  }
}

export default ISDAInterestRateSwapLogic;
