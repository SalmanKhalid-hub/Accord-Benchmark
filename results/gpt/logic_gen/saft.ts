import { ITemplateModel, ILaunch, IPayout } from './generated/org.accordproject.saft@0.2.0';

// @ts-ignore
class SaftLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ILaunch): Promise<{ result: IPayout }> {
    const tokenAmount = data.purchaseAmount.doubleValue / request.exchangeRate;

    return {
      result: {
        $class: 'org.accordproject.saft@0.2.0.Payout',
        $timestamp: new Date(),
        tokenAmount,
        tokenAddress: data.network
      }
    };
  }
}

export default SaftLogic;
