import {
  ITemplateModel,
  IPaymentDemand,
  IPaymentDemandResponse,
  IPaymentReceived,
  IPaymentReceivedResponse,
  IPaymentObligationEvent,
  IFullPaymentUponDemandState,
} from './generated/org.accordproject.fullpaymentupondemand@0.2.0';

// @ts-ignore
class FullPaymentUponDemandLogic extends TemplateLogic<ITemplateModel, IFullPaymentUponDemandState> {
  async init(data: ITemplateModel): Promise<InitResponse<IFullPaymentUponDemandState>> {
    return {
      state: {
        $class: 'org.accordproject.fullpaymentupondemand@0.2.0.FullPaymentUponDemandState',
        $identifier: data.$identifier,
        status: 'INITIALIZED',
      },
    };
  }

  async trigger(
    data: ITemplateModel,
    request: IPaymentDemand | IPaymentReceived,
    state: IFullPaymentUponDemandState
  ): Promise<EngineResponse<IFullPaymentUponDemandState>> {
    if (request.$class === 'org.accordproject.fullpaymentupondemand@0.2.0.PaymentDemand') {
      // PaymentDemand can only be triggered from INITIALIZED state
      if (state.status !== 'INITIALIZED') {
        throw new Error(`Cannot demand payment in state ${state.status}`);
      }

      const paymentObligationEvent: IPaymentObligationEvent = {
        $class: 'org.accordproject.fullpaymentupondemand@0.2.0.PaymentObligationEvent',
        $timestamp: new Date(),
        $identifier: `${data.$identifier}-payment-obligation`,
        description: `Payment obligation: ${data.buyer} shall pay ${data.amount.doubleValue} ${data.amount.currencyCode} to ${data.seller}`,
        amount: data.amount,
        party: [data.buyer, data.seller],
      };

      const response: IPaymentDemandResponse = {
        $class: 'org.accordproject.fullpaymentupondemand@0.2.0.PaymentDemandResponse',
        $timestamp: new Date(),
        $identifier: request.$identifier,
      };

      const newState: IFullPaymentUponDemandState = {
        ...state,
        status: 'PAYMENT_DEMANDED',
      };

      return {
        result: response,
        state: newState,
        events: [paymentObligationEvent],
      };
    } else if (request.$class === 'org.accordproject.fullpaymentupondemand@0.2.0.PaymentReceived') {
      // PaymentReceived can only be triggered from PAYMENT_DEMANDED state
      if (state.status !== 'PAYMENT_DEMANDED') {
        throw new Error(`Cannot receive payment in state ${state.status}`);
      }

      const response: IPaymentReceivedResponse = {
        $class: 'org.accordproject.fullpaymentupondemand@0.2.0.PaymentReceivedResponse',
        $timestamp: new Date(),
        $identifier: request.$identifier,
      };

      const newState: IFullPaymentUponDemandState = {
        ...state,
        status: 'PAYMENT_RECEIVED',
      };

      return {
        result: response,
        state: newState,
        events: [],
      };
    } else {
      throw new Error(`Unknown request type: ${request.$class}`);
    }
  }
}

export default FullPaymentUponDemandLogic;
