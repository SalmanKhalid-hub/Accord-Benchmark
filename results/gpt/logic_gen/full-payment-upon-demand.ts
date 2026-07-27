import { ITemplateModel, IPaymentDemand, IPaymentDemandResponse, IPaymentReceived, IPaymentReceivedResponse, IFullPaymentUponDemandState, IPaymentObligationEvent } from './generated/org.accordproject.fullpaymentupondemand@0.2.0';

const INITIAL_STATUS = 'INITIALIZED';
const DEMAND_MADE_STATUS = 'DEMAND_MADE';
const PAYMENT_RECEIVED_STATUS = 'PAYMENT_RECEIVED';

class FullPaymentUponDemandLogic extends TemplateLogic<ITemplateModel, IFullPaymentUponDemandState> {
  async init(data: ITemplateModel): Promise<InitResponse<IFullPaymentUponDemandState>> {
    return {
      state: {
        $class: 'org.accordproject.fullpaymentupondemand@0.2.0.FullPaymentUponDemandState',
        $identifier: data.$identifier,
        status: INITIAL_STATUS
      }
    };
  }

  async trigger(
    data: ITemplateModel,
    request: IPaymentDemand | IPaymentReceived,
    state: IFullPaymentUponDemandState
  ): Promise<EngineResponse<IPaymentDemandResponse | IPaymentReceivedResponse, IFullPaymentUponDemandState>> {
    switch (request.$class) {
      case 'org.accordproject.fullpaymentupondemand@0.2.0.PaymentDemand': {
        if (state.status !== INITIAL_STATUS) {
          throw new Error(`Illegal transition from state ${state.status} on PaymentDemand`);
        }
        const event: IPaymentObligationEvent = {
          $class: 'org.accordproject.fullpaymentupondemand@0.2.0.PaymentObligationEvent',
          amount: data.amount,
          description: `Payment of ${data.amount.doubleValue} ${data.amount.currencyCode} is due from ${data.buyer} to ${data.seller} upon demand`
        };
        return {
          result: {
            $class: 'org.accordproject.fullpaymentupondemand@0.2.0.PaymentDemandResponse'
          },
          state: {
            ...state,
            status: DEMAND_MADE_STATUS
          },
          events: [event]
        };
      }
      case 'org.accordproject.fullpaymentupondemand@0.2.0.PaymentReceived': {
        if (state.status !== DEMAND_MADE_STATUS) {
          throw new Error(`Illegal transition from state ${state.status} on PaymentReceived`);
        }
        return {
          result: {
            $class: 'org.accordproject.fullpaymentupondemand@0.2.0.PaymentReceivedResponse'
          },
          state: {
            ...state,
            status: PAYMENT_RECEIVED_STATUS
          },
          events: []
        };
      }
      default:
        throw new Error(`Unsupported request type: ${(request as any).$class}`);
    }
  }
}

// @ts-ignore
export default FullPaymentUponDemandLogic;
