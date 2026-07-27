// @ts-ignore
class DemandForecastLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IForecastRequest): Promise<{ result: IBindingResponse }> {
    const requiredPurchase = request.supplyForecast * data.minimumPercentage / 100;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    let quarter;

    if (month >= 0 && month <= 2) { // Jan-Mar
      quarter = 1;
    } else if (month >= 3 && month <= 5) { // Apr-Jun
      quarter = 2;
    } else if (month >= 6 && month <= 8) { // Jul-Sep
      quarter = 3;
    } else { // Oct-Dec
      quarter = 4;
    }

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

import {
  ITemplateModel,
  IForecastRequest,
  IBindingResponse,
} from './generated/org.accordproject.demandforecast@0.1.0';

export default DemandForecastLogic;
