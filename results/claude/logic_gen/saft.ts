import { ITemplateModel, ILaunch, ITerminate, IPayout } from './generated/org.accordproject.saft@0.2.0';

// @ts-ignore
class SAFTLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ILaunch | ITerminate): Promise<{ result: IPayout }> {
    let tokenAmount: number;
    let tokenAddress: string = '';

    if (request.$class === 'org.accordproject.saft@0.2.0.Launch') {
      const launchRequest = request as ILaunch;
      
      // Network Launch: tokenAmount = Purchase Amount / Discount Price
      // Discount Price = max public price * Discount Rate
      // Since we don't have max public price, we use: tokenAmount = Purchase Amount / (exchangeRate * Discount Rate)
      const purchaseAmountValue = data.purchaseAmount.doubleValue;
      const discountRate = data.discountRatePercentage / 100;
      const discountPrice = launchRequest.exchangeRate * discountRate;
      
      tokenAmount = purchaseAmountValue / discountPrice;
      tokenAddress = ''; // Will be provided by purchaser in separate transaction
    } else if (request.$class === 'org.accordproject.saft@0.2.0.Terminate') {
      const terminateRequest = request as ITerminate;
      
      // Dissolution Event: payout = Purchase Amount * Discount Rate
      const purchaseAmountValue = data.purchaseAmount.doubleValue;
      const discountRate = data.discountRatePercentage / 100;
      
      // Pro-rata distribution if insufficient funds
      const discountedAmount = purchaseAmountValue * discountRate;
      const remainingFunds = terminateRequest.remainingFunds;
      
      if (remainingFunds >= discountedAmount) {
        tokenAmount = discountedAmount;
      } else {
        // Pro-rata: remaining funds proportional to discounted amount
        tokenAmount = remainingFunds;
      }
      
      tokenAddress = ''; // Will be provided by purchaser
    } else {
      throw new Error('Unknown request type');
    }

    const payout: IPayout = {
      $class: 'org.accordproject.saft@0.2.0.Payout',
      $timestamp: new Date(),
      tokenAmount: tokenAmount,
      tokenAddress: tokenAddress
    };

    return { result: payout };
  }
}

export default SAFTLogic;
