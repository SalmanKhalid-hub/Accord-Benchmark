import { ITemplateModel, IPaymentReceived, IPaymentReceivedResponse, IOneTimePaymentState } from './generated/org.accordproject.onetimepaymenttr@0.2.0';

class OneTimePaymentLogicBase extends TemplateLogic<ITemplateModel, IOneTimePaymentState> {
  public async init(data: ITemplateModel): Promise<InitResponse<IOneTimePaymentState>> {
    return {
      state: {
        $class: 'org.accordproject.onetimepaymenttr@0.2.0.OneTimePaymentState',
        $identifier: data.$identifier,
        status: 'INITIATED'
      }
    };
  }

  public async trigger(
    data: ITemplateModel,
    request: IPaymentReceived,
    state: IOneTimePaymentState
  ): Promise<EngineResponse<IPaymentReceivedResponse, IOneTimePaymentState>> {
    if (request.$class === 'org.accordproject.onetimepaymenttr@0.2.0.PaymentReceived') {
      if (state.status !== 'INITIATED') {
        throw new Error(`Illegal transition from ${state.status} on PaymentReceived`);
      }

      const amount = data.totalPurchasePrice;
      const event = {
        $class: 'org.accordproject.onetimepaymenttr@0.2.0.PaymentObligationEvent',
        amount: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: amount.doubleValue,
          currencyCode: amount.currencyCode
        },
        description: `Payment obligation for ${data.buyer} to ${data.seller}`
      };

      return {
        result: {
          $class: 'org.accordproject.onetimepaymenttr@0.2.0.PaymentReceivedResponse'
        },
        state: {
          $class: 'org.accordproject.onetimepaymenttr@0.2.0.OneTimePaymentState',
          $identifier: state.$identifier,
          status: 'PAID'
        },
        events: [event]
      };
    }

    throw new Error(`Unsupported request type ${request.$class}`);
  }
}

// @ts-ignore
export default OneTimePaymentLogicBase;
