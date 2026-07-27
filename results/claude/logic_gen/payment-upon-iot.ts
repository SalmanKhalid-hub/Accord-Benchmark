import {
  ITemplateModel,
  IContractSigned,
  ISingleButtonPress,
  IDoubleButtonPress,
  ILongButtonPress,
  IPaymentReceived,
  ICounterResponse,
  IPaymentObligationEvent,
  ICounterState,
  ContractLifecycleStatus,
} from './generated/org.accordproject.paymentuponiot@0.2.0';

// @ts-ignore
class PaymentUponIoTLogic extends TemplateLogic<ITemplateModel, ICounterState> {
  async init(data: ITemplateModel): Promise<InitResponse<ICounterState>> {
    return {
      state: {
        $class: 'org.accordproject.paymentuponiot@0.2.0.CounterState',
        $identifier: data.$identifier,
        status: ContractLifecycleStatus.INITIALIZED,
        counter: 0,
        paymentCount: 0,
      },
    };
  }

  async trigger(
    data: ITemplateModel,
    request: IContractSigned | ISingleButtonPress | IDoubleButtonPress | ILongButtonPress | IPaymentReceived,
    state: ICounterState
  ): Promise<EngineResponse<ICounterState, ICounterResponse | IPaymentObligationEvent>> {
    if (request.$class === 'org.accordproject.paymentuponiot@0.2.0.ContractSigned') {
      const contractSignedRequest = request as IContractSigned;
      if (state.status !== ContractLifecycleStatus.INITIALIZED) {
        throw new Error(
          `Cannot sign contract in status ${state.status}. Expected INITIALIZED.`
        );
      }
      const newState: ICounterState = {
        ...state,
        status: ContractLifecycleStatus.RUNNING,
      };
      const response: ICounterResponse = {
        $class: 'org.accordproject.paymentuponiot@0.2.0.CounterResponse',
        counter: newState.counter,
        paymentCount: newState.paymentCount,
      };
      return {
        result: response,
        state: newState,
        events: [],
      };
    }

    if (request.$class === 'org.accordproject.paymentuponiot@0.2.0.SingleButtonPress') {
      if (state.status !== ContractLifecycleStatus.RUNNING) {
        throw new Error(
          `Cannot process button press in status ${state.status}. Expected RUNNING.`
        );
      }
      const newState: ICounterState = {
        ...state,
        counter: state.counter + 1,
      };
      const response: ICounterResponse = {
        $class: 'org.accordproject.paymentuponiot@0.2.0.CounterResponse',
        counter: newState.counter,
        paymentCount: newState.paymentCount,
      };
      return {
        result: response,
        state: newState,
        events: [],
      };
    }

    if (request.$class === 'org.accordproject.paymentuponiot@0.2.0.DoubleButtonPress') {
      if (state.status !== ContractLifecycleStatus.RUNNING) {
        throw new Error(
          `Cannot process button press in status ${state.status}. Expected RUNNING.`
        );
      }
      const newState: ICounterState = {
        ...state,
        counter: Math.max(0, state.counter - 1),
      };
      const response: ICounterResponse = {
        $class: 'org.accordproject.paymentuponiot@0.2.0.CounterResponse',
        counter: newState.counter,
        paymentCount: newState.paymentCount,
      };
      return {
        result: response,
        state: newState,
        events: [],
      };
    }

    if (request.$class === 'org.accordproject.paymentuponiot@0.2.0.LongButtonPress') {
      if (state.status !== ContractLifecycleStatus.RUNNING) {
        throw new Error(
          `Cannot process long button press in status ${state.status}. Expected RUNNING.`
        );
      }
      if (state.paymentCount >= data.paymentCount) {
        throw new Error(
          `Maximum payment count (${data.paymentCount}) reached. Contract is COMPLETED.`
        );
      }

      const paymentAmount = state.counter * data.amountPerUnit.doubleValue;
      const newPaymentCount = state.paymentCount + 1;
      const newStatus =
        newPaymentCount >= data.paymentCount
          ? ContractLifecycleStatus.COMPLETED
          : ContractLifecycleStatus.RUNNING;

      const newState: ICounterState = {
        ...state,
        status: newStatus,
        paymentCount: newPaymentCount,
        counter: 0,
      };

      const paymentEvent: IPaymentObligationEvent = {
        $class: 'org.accordproject.paymentuponiot@0.2.0.PaymentObligationEvent',
        $identifier: `${data.$identifier}-payment-${newPaymentCount}`,
        $timestamp: new Date(),
        amount: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: paymentAmount,
          currencyCode: data.amountPerUnit.currencyCode,
        },
        description: `Payment obligation for ${state.counter} button presses at ${data.amountPerUnit.doubleValue} ${data.amountPerUnit.currencyCode} per unit`,
        party: data.seller,
      };

      const response: ICounterResponse = {
        $class: 'org.accordproject.paymentuponiot@0.2.0.CounterResponse',
        counter: newState.counter,
        paymentCount: newState.paymentCount,
      };

      return {
        result: response,
        state: newState,
        events: [paymentEvent],
      };
    }

    if (request.$class === 'org.accordproject.paymentuponiot@0.2.0.PaymentReceived') {
      if (state.status === ContractLifecycleStatus.COMPLETED) {
        throw new Error(
          `Cannot receive payment in status ${state.status}. Contract is COMPLETED.`
        );
      }
      const paymentRequest = request as IPaymentReceived;
      const newState: ICounterState = {
        ...state,
      };
      const response: ICounterResponse = {
        $class: 'org.accordproject.paymentuponiot@0.2.0.CounterResponse',
        counter: newState.counter,
        paymentCount: newState.paymentCount,
      };
      return {
        result: response,
        state: newState,
        events: [],
      };
    }

    throw new Error(`Unknown request type: ${request.$class}`);
  }
}

export default PaymentUponIoTLogic;
