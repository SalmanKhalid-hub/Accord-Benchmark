import { ITemplateModel, ICounterResponse, ICounterState, IContractSigned, ISingleButtonPress, IDoubleButtonPress, ILongButtonPress, IPaymentReceived } from './generated/org.accordproject.paymentuponiot@0.2.0';
import { CurrencyCode } from './generated/org.accordproject.money@0.3.0';

class PaymentUponIoTLogic extends TemplateLogic<ITemplateModel, ICounterState> {
  async init(data: ITemplateModel): Promise<InitResponse<ICounterState>> {
    return {
      state: {
        $class: 'org.accordproject.paymentuponiot@0.2.0.CounterState',
        $identifier: data.$identifier,
        status: 'INITIALIZED',
        counter: 0,
        paymentCount: 0
      }
    };
  }

  async trigger(
    data: ITemplateModel,
    request: IContractSigned | ISingleButtonPress | IDoubleButtonPress | ILongButtonPress | IPaymentReceived,
    state: ICounterState
  ): Promise<EngineResponse<ICounterState, ICounterResponse>> {
    if (request.$class === 'org.accordproject.paymentuponiot@0.2.0.ContractSigned') {
      if (state.status !== 'INITIALIZED') {
        throw new Error(`Illegal transition from ${state.status} on ContractSigned`);
      }
      return {
        result: undefined,
        state: {
          ...state,
          status: 'RUNNING'
        },
        events: []
      };
    }

    if (state.status !== 'RUNNING') {
      throw new Error(`Illegal transition from ${state.status} on ${request.$class}`);
    }

    if (request.$class === 'org.accordproject.paymentuponiot@0.2.0.SingleButtonPress') {
      const counter = state.counter + 1;
      return {
        result: {
          $class: 'org.accordproject.paymentuponiot@0.2.0.CounterResponse',
          counter,
          paymentCount: state.paymentCount
        },
        state: {
          ...state,
          counter
        },
        events: []
      };
    }

    if (request.$class === 'org.accordproject.paymentuponiot@0.2.0.DoubleButtonPress') {
      const counter = state.counter - 1;
      return {
        result: {
          $class: 'org.accordproject.paymentuponiot@0.2.0.CounterResponse',
          counter,
          paymentCount: state.paymentCount
        },
        state: {
          ...state,
          counter
        },
        events: []
      };
    }

    if (request.$class === 'org.accordproject.paymentuponiot@0.2.0.LongButtonPress') {
      if (state.paymentCount >= 5) {
        return {
          result: {
            $class: 'org.accordproject.paymentuponiot@0.2.0.CounterResponse',
            counter: state.counter,
            paymentCount: state.paymentCount
          },
          state: {
            ...state,
            status: 'COMPLETED'
          },
          events: []
        };
      }

      const amountValue = state.counter * (data.amountPerUnit.doubleValue || 10);
      const paymentAmount = {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: amountValue,
        currencyCode: data.amountPerUnit.currencyCode || CurrencyCode.USD
      };

      const nextPaymentCount = state.paymentCount + 1;
      const nextStatus = nextPaymentCount >= 5 ? 'COMPLETED' : 'RUNNING';

      return {
        result: {
          $class: 'org.accordproject.paymentuponiot@0.2.0.CounterResponse',
          counter: state.counter,
          paymentCount: nextPaymentCount
        },
        state: {
          ...state,
          paymentCount: nextPaymentCount,
          status: nextStatus
        },
        events: [
          {
            $class: 'org.accordproject.paymentuponiot@0.2.0.PaymentObligationEvent',
            amount: paymentAmount,
            description: `Pay ${amountValue} USD to ${data.seller} for ${state.counter} short button press${state.counter === 1 ? '' : 'es'}`
          }
        ]
      };
    }

    if (request.$class === 'org.accordproject.paymentuponiot@0.2.0.PaymentReceived') {
      const unitsPaid = request.amount.doubleValue / data.amountPerUnit.doubleValue;
      const counter = state.counter - unitsPaid;
      return {
        result: {
          $class: 'org.accordproject.paymentuponiot@0.2.0.CounterResponse',
          counter,
          paymentCount: state.paymentCount
        },
        state: {
          ...state,
          counter
        },
        events: []
      };
    }

    throw new Error(`Unsupported request type: ${(request as any).$class}`);
  }
}

export default PaymentUponIoTLogic;
