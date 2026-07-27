import {
  ITemplateModel,
  IContractSigned,
  IContractSignedResponse,
  IPaymentReceived,
  IPaymentReceivedResponse,
  IPaymentObligationEvent,
  IPaymentUponSignatureState,
} from './generated/org.accordproject.paymentuponssignature@0.2.0';

// @ts-ignore
class PaymentUponSignatureLogic extends TemplateLogic<ITemplateModel, IPaymentUponSignatureState> {
  async init(data: ITemplateModel): Promise<InitResponse<IPaymentUponSignatureState>> {
    return {
      state: {
        $class: 'org.accordproject.paymentuponssignature@0.2.0.PaymentUponSignatureState',
        $identifier: data.$identifier,
        status: 'INITIALIZED',
      },
    };
  }

  async trigger(
    data: ITemplateModel,
    request: IContractSigned | IPaymentReceived,
    state: IPaymentUponSignatureState
  ): Promise<EngineResponse<IPaymentUponSignatureState>> {
    if (request.$class === 'org.accordproject.paymentuponssignature@0.2.0.ContractSigned') {
      if (state.status !== 'INITIALIZED') {
        throw new Error(`Cannot sign contract in status ${state.status}`);
      }

      const paymentObligation: IPaymentObligationEvent = {
        $class: 'org.accordproject.paymentuponssignature@0.2.0.PaymentObligationEvent',
        $identifier: `${data.$identifier}-payment-obligation`,
        $timestamp: new Date(),
        amount: data.amount,
        description: `Payment obligation: ${data.buyer} shall pay ${data.amount.doubleValue} ${data.amount.currencyCode} to ${data.seller}`,
      };

      return {
        result: {
          $class: 'org.accordproject.paymentuponssignature@0.2.0.ContractSignedResponse',
          $timestamp: new Date(),
        },
        state: {
          $class: 'org.accordproject.paymentuponssignature@0.2.0.PaymentUponSignatureState',
          $identifier: state.$identifier,
          status: 'SIGNED',
        },
        events: [paymentObligation],
      };
    } else if (request.$class === 'org.accordproject.paymentuponssignature@0.2.0.PaymentReceived') {
      if (state.status !== 'SIGNED') {
        throw new Error(`Cannot receive payment in status ${state.status}`);
      }

      return {
        result: {
          $class: 'org.accordproject.paymentuponssignature@0.2.0.PaymentReceivedResponse',
          $timestamp: new Date(),
        },
        state: {
          $class: 'org.accordproject.paymentuponssignature@0.2.0.PaymentUponSignatureState',
          $identifier: state.$identifier,
          status: 'COMPLETED',
        },
        events: [],
      };
    }

    throw new Error(`Unknown request type: ${request.$class}`);
  }
}

export default PaymentUponSignatureLogic;
