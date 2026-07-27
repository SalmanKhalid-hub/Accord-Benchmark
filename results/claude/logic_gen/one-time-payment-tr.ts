import {
  ITemplateModel,
  IPaymentReceived,
  IPaymentReceivedResponse,
  IOneTimePaymentState,
  IPaymentObligationEvent,
} from './generated/org.accordproject.onetimepaymenttr@0.2.0';

// @ts-ignore
class OneTimePaymentLogic extends TemplateLogic<ITemplateModel, IOneTimePaymentState> {
  async init(data: ITemplateModel): Promise<InitResponse<IOneTimePaymentState>> {
    return {
      state: {
        $class: 'org.accordproject.onetimepaymenttr@0.2.0.OneTimePaymentState',
        $identifier: data.$identifier,
        status: 'INITIALIZED',
      },
    };
  }

  async trigger(
    data: ITemplateModel,
    request: IPaymentReceived,
    state: IOneTimePaymentState
  ): Promise<EngineResponse<IOneTimePaymentState>> {
    if (request.$class === 'org.accordproject.onetimepaymenttr@0.2.0.PaymentReceived') {
      // Enforce state machine: only accept payment in INITIALIZED state
      if (state.status !== 'INITIALIZED') {
        throw new Error(
          `Cannot process payment in state '${state.status}'. Expected state 'INITIALIZED'.`
        );
      }

      // Create payment obligation event
      const paymentEvent: IPaymentObligationEvent = {
        $class: 'org.accordproject.onetimepaymenttr@0.2.0.PaymentObligationEvent',
        $timestamp: new Date(),
        amount: data.totalPurchasePrice,
        description: `Payment obligation from ${data.buyer} to ${data.seller} for total purchase price`,
        party: data.seller,
      };

      // Update state to PAYMENT_RECEIVED
      const newState: IOneTimePaymentState = {
        $class: 'org.accordproject.onetimepaymenttr@0.2.0.OneTimePaymentState',
        $identifier: state.$identifier,
        status: 'PAYMENT_RECEIVED',
      };

      // Create response
      const response: IPaymentReceivedResponse = {
        $class: 'org.accordproject.onetimepaymenttr@0.2.0.PaymentReceivedResponse',
        $timestamp: new Date(),
      };

      return {
        result: response,
        state: newState,
        events: [paymentEvent],
      };
    }

    throw new Error(`Unknown request type: ${request.$class}`);
  }
}

export default OneTimePaymentLogic;
