import { ITemplateModel, IForecastRequest, IBindingResponse } from "./generated/org.accordproject.demandforecast@0.1.0";

export default class DemandForecastLogic extends TemplateLogic<ITemplateModel> {
  public async trigger(data: ITemplateModel, request: IForecastRequest): Promise<{ result: IBindingResponse }> {
    const requiredPurchase = request.supplyForecast * (data.minimumPercentage / 100.0);
    const effectiveDate = data.effectiveDate ? new Date(data.effectiveDate) : new Date();

    const quarter = Math.floor(effectiveDate.getMonth() / 3) + 1;
    const year = effectiveDate.getFullYear();

    return {
      result: {
        $class: "org.accordproject.demandforecast@0.1.0.BindingResponse",
        $timestamp: new Date(),
        requiredPurchase,
        year,
        quarter
      }
    };
  }
}
