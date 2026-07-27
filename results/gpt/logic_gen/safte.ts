import { ITemplateModel, ITokenSale, ITokenShare } from './generated/org.accordproject.safte@0.2.0';

class SafteLogicBase {
  async trigger(data: ITemplateModel, request: ITokenSale): Promise<{ result: ITokenShare }> {
    const discountRate = 100 - data.discount;
    const tokenAmount = request.tokenPrice.doubleValue / discountRate;

    return {
      result: {
        $class: 'org.accordproject.safte@0.2.0.TokenShare',
        $timestamp: new Date(),
        tokenAmount
      }
    };
  }
}

// @ts-ignore
export default class SafteLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ITokenSale): Promise<{ result: ITokenShare }> {
    const discountRate = 100 - data.discount;
    const tokenAmount = request.tokenPrice.doubleValue / discountRate;

    return {
      result: {
        $class: 'org.accordproject.safte@0.2.0.TokenShare',
        $timestamp: new Date(),
        tokenAmount
      }
    };
  }
}
