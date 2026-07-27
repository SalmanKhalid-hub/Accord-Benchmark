import { ITemplateModel, IContractSigned, IContractSignedResponse, IPaymentReceived, IPaymentReceivedResponse, IPaymentUponSignatureState, IPaymentObligationEvent } from './generated/org.accordproject.paymentuponssignature@0.2.0';

class PaymentUponSignatureLogic extends TemplateLogic<ITemplateModel, IPaymentUponSignatureState> {
  async init(data: ITemplateModel): Promise<InitResponse<IPaymentUponSignatureState>> {
    return {
      state: {
        $class: 'org.accordproject.paymentuponssignature@0.2.0.PaymentUponSignatureState',
        $identifier: data.$identifier,
        status: 'INITIALIZED'
      }
    };
  }

  async trigger(data: ITemplateModel, request: IContractSigned | IPaymentReceived, state: IPaymentUponSignatureState): Promise<EngineResponse<IPaymentUponSignatureState, IContractSignedResponse | IPaymentReceivedResponse>> {
    switch (request.$class) {
      case 'org.accordproject.paymentuponssignature@0.2.0.ContractSigned': {
        if (state.status !== 'INITIALIZED') {
          throw new Error(`Illegal transition from ${state.status} on ContractSigned`);
        }
        const amount = {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: 50,
          currencyCode: 'USD'
        };
        return {
          result: {
            $class: 'org.accordproject.paymentuponssignature@0.2.0.ContractSignedResponse'
          },
          state: {
            $class: 'org.accordproject.paymentuponssignature@0.2.0.PaymentUponSignatureState',
            $identifier: state.$identifier,
            status: 'SIGNED'
          },
          events: [{
            $class: 'org.accordproject.paymentuponssignature@0.2.0.PaymentObligationEvent',
            amount,
            description: 'Dave shall pay 50 USD to Dan upon signature of this Agreement.'
          }]
        };
      }
      case 'org.accordproject.paymentuponssignature@0.2.0.PaymentReceived': {
        if (state.status !== 'SIGNED') {
          throw new Error(`Illegal transition from ${state.status} on PaymentReceived`);
        }
        return {
          result: {
            $class: 'org.accordproject.paymentuponssignature@0.2.0.PaymentReceivedResponse'
          },
          state: {
            $class: 'org.accordproject.paymentuponssignature@0.2.0.PaymentUponSignatureState',
            $identifier: state.$identifier,
            status: 'PAID'
          },
          events: []
        };
      }
      default:
        throw new Error(`Unsupported request type: ${request.$class}`);
    }
  }
}

export default PaymentUponSignatureLogic;
