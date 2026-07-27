import {
  ITemplateModel,
  IContractSigned,
  IContractSignedResponse,
  IPaymentReceived,
  IPaymentReceivedResponse,
  IPaymentObligationEvent,
  IFullPaymentUponSignatureState,
} from './generated/org.accordproject.fullpaymentupondsignature@0.2.0';

// @ts-ignore
class FullPaymentUponSignatureLogic extends TemplateLogic<ITemplateModel, IFullPaymentUponSignatureState> {
  async init(data: ITemplateModel): Promise<InitResponse<IFullPaymentUponSignatureState>> {
    return {
      state: {
        $class: 'org.accordproject.fullpaymentupondsignature@0.2.0.FullPaymentUponSignatureState',
        $identifier: data.$identifier,
        status: 'INITIALIZED',
      },
    };
  }

  async trigger(
    data: ITemplateModel,
    request: IContractSigned | IPaymentReceived,
    state: IFullPaymentUponSignatureState
  ): Promise<EngineResponse<IFullPaymentUponSignatureState>> {
    if (request.$class === 'org.accordproject.fullpaymentupondsignature@0.2.0.ContractSigned') {
      if (state.status !== 'INITIALIZED') {
        throw new Error(`Cannot sign contract in state ${state.status}`);
      }

      const paymentEvent: IPaymentObligationEvent = {
        $class: 'org.accordproject.fullpaymentupondsignature@0.2.0.PaymentObligationEvent',
        $identifier: `${data.$identifier}-payment-obligation`,
        $timestamp: new Date(),
        description: `Payment obligation for ${data.buyer} to pay ${data.seller}`,
        amount: data.amount,
        contract: data.$identifier,
        promisor: data.buyer,
        promisee: data.seller,
        deadline: null,
      };

      const newState: IFullPaymentUponSignatureState = {
        ...state,
        status: 'SIGNED',
      };

      return {
        result: {
          $class: 'org.accordproject.fullpaymentupondsignature@0.2.0.ContractSignedResponse',
        },
        state: newState,
        events: [paymentEvent],
      };
    } else if (request.$class === 'org.accordproject.fullpaymentupondsignature@0.2.0.PaymentReceived') {
      if (state.status !== 'SIGNED') {
        throw new Error(`Cannot receive payment in state ${state.status}`);
      }

      const newState: IFullPaymentUponSignatureState = {
        ...state,
        status: 'PAYMENT_RECEIVED',
      };

      return {
        result: {
          $class: 'org.accordproject.fullpaymentupondsignature@0.2.0.PaymentReceivedResponse',
        },
        state: newState,
        events: [],
      };
    }

    throw new Error(`Unknown request type: ${request.$class}`);
  }
}

export default FullPaymentUponSignatureLogic;
