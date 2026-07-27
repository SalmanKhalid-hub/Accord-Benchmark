// @ts-ignore
class PaymentUponSignatureLogic extends TemplateLogic<ITemplateModel, IPaymentUponSignatureState> {
  async init(data: ITemplateModel): Promise<InitResponse<IPaymentUponSignatureState>> {
    return {
      state: {
        $class: 'org.accordproject.paymentuponssignature.PaymentUponSignatureState',
        $identifier: data.$identifier,
        status: 'INITIALIZED',
      },
    };
  }

  async trigger(
    data: ITemplateModel,
    request: ContractSigned | PaymentReceived,
    state: IPaymentUponSignatureState
  ): Promise<EngineResponse<ContractSignedResponse | PaymentReceivedResponse, IPaymentUponSignatureState, PaymentObligationEvent>> {
    switch (request.$class) {
      case 'org.accordproject.paymentuponssignature.ContractSigned': {
        if (state.status !== 'INITIALIZED') {
          throw new Error(`Invalid state for ContractSigned: ${state.status}. Expected INITIALIZED.`);
        }

        const paymentObligationEvent: PaymentObligationEvent = {
          $class: 'org.accordproject.paymentuponssignature.PaymentObligationEvent',
          $timestamp: new Date(),
          amount: {
            $class: 'org.accordproject.money.MonetaryAmount',
            doubleValue: data.amount.doubleValue,
            currencyCode: data.amount.currencyCode,
          },
          description: `Payment of ${data.amount.doubleValue} ${data.amount.currencyCode} from ${data.buyer} to ${data.seller}`,
          promisor: data.buyer,
          promisee: data.seller,
        };

        return {
          result: {
            $class: 'org.accordproject.paymentuponssignature.ContractSignedResponse',
            $timestamp: new Date(),
          },
          state: {
            ...state,
            status: 'PAYMENT_DUE',
          },
          events: [paymentObligationEvent],
        };
      }

      case 'org.accordproject.paymentuponssignature.PaymentReceived': {
        if (state.status !== 'PAYMENT_DUE') {
          throw new Error(`Invalid state for PaymentReceived: ${state.status}. Expected PAYMENT_DUE.`);
        }

        return {
          result: {
            $class: 'org.accordproject.paymentuponssignature.PaymentReceivedResponse',
            $timestamp: new Date(),
          },
          state: {
            ...state,
            status: 'PAID',
          },
          events: [],
        };
      }

      default: {
        throw new Error(`Unknown request type: ${request.$class}`);
      }
    }
  }
}

import {
  ITemplateModel,
  IContractSigned,
  IContractSignedResponse,
  IPaymentReceived,
  IPaymentReceivedResponse,
  IPaymentUponSignatureState,
  IPaymentObligationEvent as PaymentObligationEvent,
} from './generated/org.accordproject.paymentuponssignature@0.2.0';

import {
  CurrencyCode
} from './generated/org.accordproject.money@0.3.0';

declare const TemplateLogic: any;
declare const InitResponse: any;
declare const EngineResponse: any;

export default PaymentUponSignatureLogic;
