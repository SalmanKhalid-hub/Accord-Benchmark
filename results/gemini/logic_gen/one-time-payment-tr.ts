// @ts-ignore
class OneTimePaymentLogic extends TemplateLogic<ITemplateModel, IOneTimePaymentState> {
  async init(data: ITemplateModel): Promise<InitResponse<IOneTimePaymentState>> {
    return {
      state: {
        $class: 'org.accordproject.onetimepaymenttr.OneTimePaymentState',
        $identifier: data.$identifier,
        status: 'WAITING_FOR_PAYMENT',
      },
    };
  }

  async trigger(
    data: ITemplateModel,
    request: Request,
    state: IOneTimePaymentState
  ): Promise<EngineResponse<PaymentReceivedResponse, IOneTimePaymentState>> {
    if (request.$class === 'org.accordproject.onetimepaymenttr.PaymentReceived') {
      if (state.status !== 'WAITING_FOR_PAYMENT') {
        throw new Error(`Invalid state for PaymentReceived: ${state.status}`);
      }

      const paymentObligationEvent: IPaymentObligationEvent = {
        $class: 'org.accordproject.onetimepaymenttr.PaymentObligationEvent',
        $timestamp: new Date(),
        amount: data.totalPurchasePrice,
        description: `Payment for one-time payment service from ${data.buyer} to ${data.seller}`,
        obligor: data.buyer,
        payee: data.seller,
      };

      return {
        result: {
          $class: 'org.accordproject.onetimepaymenttr.PaymentReceivedResponse',
        },
        state: {
          ...state,
          status: 'PAYMENT_RECEIVED',
        },
        events: [paymentObligationEvent],
      };
    } else {
      throw new Error(`Unknown request type: ${request.$class}`);
    }
  }
}

default export OneTimePaymentLogic;
