import {
  ITemplateModel,
  IForecastRequest,
  IBindingResponse,
} from './generated/org.accordproject.demandforecast@0.1.0';

// @ts-ignore
class DemandForecastLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: IForecastRequest
  ): Promise<{ result: IBindingResponse }> {
    const forecastDate = new Date();
    const year = forecastDate.getFullYear();
    const month = forecastDate.getMonth() + 1;

    let quarter: number;
    if (month >= 1 && month <= 3) {
      quarter = 1;
    } else if (month >= 4 && month <= 6) {
      quarter = 2;
    } else if (month >= 7 && month <= 9) {
      quarter = 3;
    } else {
      quarter = 4;
    }

    const requiredPurchase =
      request.supplyForecast * (data.minimumPercentage / 100);

    return {
      result: {
        $class: 'org.accordproject.demandforecast@0.1.0.BindingResponse',
        $timestamp: new Date(),
        requiredPurchase: requiredPurchase,
        year: year,
        quarter: quarter,
      },
    };
  }
}

export default DemandForecastLogic;
