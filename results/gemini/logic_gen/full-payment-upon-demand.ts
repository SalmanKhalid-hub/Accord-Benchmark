// @ts-ignore
class FullPaymentUponDemandLogic extends TemplateLogic<ITemplateModel, IFullPaymentUponDemandState> {
  async init(data: ITemplateModel): Promise<InitResponse<IFullPaymentUponDemandState>> {
    return {
      state: {
        $class: 'org.accordproject.fullpaymentupondemand.FullPaymentUponDemandState',
        $identifier: data.$identifier,
        status: 'INITIALIZED',
      },
    };
  }

  async trigger(
    data: ITemplateModel,
    request: PaymentDemand | PaymentReceived,
    state: IFullPaymentUponDemandState
  ): Promise<EngineResponse> {
    switch (request.$class) {
      case 'org.accordproject.fullpaymentupondemand.PaymentDemand': {
        if (state.status !== 'INITIALIZED') {
          throw new Error('PaymentDemand can only be made when the contract is INITIALIZED.');
        }

        const paymentObligationEvent: IPaymentObligationEvent = {
          $class: 'org.accordproject.fullpaymentupondemand.PaymentObligationEvent',
          $timestamp: new Date(),
          amount: data.amount,
          description: `Payment of ${data.amount.doubleValue} ${data.amount.currencyCode} due from ${data.buyer} to ${data.seller}.`,
          promisor: data.buyer,
          promisee: data.seller,
        };

        return {
          result: {
            $class: 'org.accordproject.fullpaymentupondemand.PaymentDemandResponse',
            $timestamp: new Date(),
          },
          state: {
            ...state,
            status: 'DEMANDED',
          },
          events: [paymentObligationEvent],
        };
      }

      case 'org.accordproject.fullpaymentupondemand.PaymentReceived': {
        if (state.status !== 'DEMANDED') {
          throw new Error('PaymentReceived can only be processed when a payment has been DEMANDED.');
        }

        return {
          result: {
            $class: 'org.accordproject.fullpaymentupondemand.PaymentReceivedResponse',
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
  IPaymentDemand,
  IPaymentDemandResponse,
  IPaymentReceived,
  IPaymentReceivedResponse,
  IPaymentObligationEvent,
  IFullPaymentUponDemandState,
} from './generated/org.accordproject.fullpaymentupondemand@0.2.0';

import { CurrencyCode } from './generated/org.accordproject.money@0.3.0';

declare var TemplateLogic: any;
declare var EngineResponse: any;
declare var InitResponse: any;

export default FullPaymentUponDemandLogic;
