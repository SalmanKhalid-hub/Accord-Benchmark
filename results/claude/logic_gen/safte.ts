import { ITemplateModel, ITokenSale, ITokenShare } from './generated/org.accordproject.safte@0.2.0';

// @ts-ignore
class SAFTELogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ITokenSale): Promise<{ result: ITokenShare }> {
    // Calculate discount rate: 100 - 7 = 93, so discount rate is 0.93
    const discountRate = (100 - data.discount) / 100;

    // Calculate token amount: Purchase Amount / Discount Rate
    const purchaseAmountValue = data.purchaseAmount.doubleValue;
    const tokenAmount = purchaseAmountValue / discountRate;

    // Return the TokenShare response
    const response: ITokenShare = {
      $class: 'org.accordproject.safte@0.2.0.TokenShare',
      $timestamp: new Date(),
      tokenAmount: tokenAmount,
    };

    return { result: response };
  }
}

export default SAFTELogic;
