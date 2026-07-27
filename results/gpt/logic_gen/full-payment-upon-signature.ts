import { ITemplateModel, IContractSigned, IContractSignedResponse, IPaymentReceived, IPaymentReceivedResponse, IFullPaymentUponSignatureState, IPaymentObligationEvent } from './generated/org.accordproject.fullpaymentupondsignature@0.2.0';

class FullPaymentUponSignatureLogic extends TemplateLogic<ITemplateModel, IFullPaymentUponSignatureState> {
  public async init(data: ITemplateModel): Promise<InitResponse<IFullPaymentUponSignatureState>> {
    return {
      state: {
        $class: 'org.accordproject.fullpaymentupondsignature@0.2.0.FullPaymentUponSignatureState',
        $identifier: data.$identifier,
        status: 'INITIALIZED'
      }
    };
  }

  public async trigger(
    data: ITemplateModel,
    request: IContractSigned | IPaymentReceived,
    state: IFullPaymentUponSignatureState
  ): Promise<EngineResponse<IContractSignedResponse | IPaymentReceivedResponse, IFullPaymentUponSignatureState>> {
    if (request.$class === 'org.accordproject.fullpaymentupondsignature@0.2.0.ContractSigned') {
      if (state.status !== 'INITIALIZED') {
        throw new Error(`Illegal transition from ${state.status} on ContractSigned`);
      }

      const amount = {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: 0.01,
        currencyCode: 'USD'
      };

      const event: IPaymentObligationEvent = {
        $class: 'org.accordproject.fullpaymentupondsignature@0.2.0.PaymentObligationEvent',
        amount,
        description: `Dan shall pay Steve the total purchase price of 0.01 USD upon signature.`
      };

      return {
        result: {
          $class: 'org.accordproject.fullpaymentupondsignature@0.2.0.ContractSignedResponse'
        } as IContractSignedResponse,
        state: {
          ...state,
          status: 'SIGNED'
        },
        events: [event]
      };
    }

    if (request.$class === 'org.accordproject.fullpaymentupondsignature@0.2.0.PaymentReceived') {
      if (state.status !== 'SIGNED') {
        throw new Error(`Illegal transition from ${state.status} on PaymentReceived`);
      }

      return {
        result: {
          $class: 'org.accordproject.fullpaymentupondsignature@0.2.0.PaymentReceivedResponse'
        } as IPaymentReceivedResponse,
        state: {
          ...state,
          status: 'PAID'
        },
        events: []
      };
    }

    throw new Error(`Unexpected request type: ${request.$class}`);
  }
}

export default FullPaymentUponSignatureLogic;
