// @ts-ignore
class SaftLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ILaunch): Promise<{ result: IPayout }> {
    if (request.$class === 'org.accordproject.saft@0.2.0.Launch') {
      const discountRate = data.discountRatePercentage / 100;
      const purchaseAmountValue = data.purchaseAmount.doubleValue;
      const exchangeRate = request.exchangeRate;

      // Assuming "Discount Price" is the maximum price per Token sold by the Company to the public
      // during the Network Launch multiplied by the Discount Rate.
      // For this logic, we'll assume the 'exchangeRate' from the Launch transaction
      // represents the maximum price per token sold to the public.
      const discountPrice = exchangeRate * discountRate;

      // Number of units of the Token equal to the Purchase Amount divided by the Discount Price.
      const tokenAmount = purchaseAmountValue / discountPrice;

      return {
        result: {
          $class: 'org.accordproject.saft@0.2.0.Payout',
          $timestamp: new Date(),
          tokenAmount: tokenAmount,
          tokenAddress: 'PurchaserWalletAddress', // This would typically come from the request or data
        },
      };
    } else if (request.$class === 'org.accordproject.saft@0.2.0.Terminate') {
      // Handle termination logic if needed, though the prompt focuses on Launch
      // For termination, the clause states:
      // "the Company will pay an amount equal to the Purchase Amount multiplied by the Discount Rate
      // (the “Discounted Purchase Amount”), due and payable to the Purchaser immediately prior to,
      // or concurrent with, the consummation of the Dissolution Event"
      // The `Terminate` transaction has `remainingFunds` and `totalInvested`.
      // We'll assume `remainingFunds` is what's available for distribution.
      const discountRate = data.discountRatePercentage / 100;
      const purchaseAmountValue = data.purchaseAmount.doubleValue;
      const discountedPurchaseAmount = purchaseAmountValue * discountRate;

      // If remaining funds are insufficient, pro-rata distribution.
      // For simplicity, we'll assume `remainingFunds` is the amount to be paid out
      // and `totalInvested` is the denominator for pro-rata calculation if needed.
      // Here, we'll just return the discounted purchase amount as the tokenAmount
      // (even though it's a monetary amount in the clause, Payout expects a double for tokenAmount).
      // This might need clarification based on how 'tokenAmount' is interpreted in a termination scenario.
      // For now, we'll return the discounted purchase amount as the tokenAmount.
      const payoutAmount = Math.min(discountedPurchaseAmount, request.remainingFunds);

      return {
        result: {
          $class: 'org.accordproject.saft@0.2.0.Payout',
          $timestamp: new Date(),
          tokenAmount: payoutAmount,
          tokenAddress: 'PurchaserWalletAddress', // This would typically come from the request or data
        },
      };
    }
    throw new Error('Unknown request type');
  }
}

import {
  ITemplateModel,
  ILaunch,
  IPayout,
  ITerminate,
} from './generated/org.accordproject.saft@0.2.0';

export default SaftLogic;
