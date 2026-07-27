// @ts-ignore
export default class PaymentUponIoTLogic extends TemplateLogic<ITemplateModel, ICounterState> {
  async init(data: ITemplateModel): Promise<InitResponse<ICounterState>> {
    return {
      state: {
        $class: 'org.accordproject.paymentuponiot@0.2.0.CounterState',
        $identifier: data.$identifier,
        status: 'INITIALIZED',
        counter: 0,
        paymentCount: 0,
      },
    };
  }

  async trigger(
    data: ITemplateModel,
    request: Request,
    state: ICounterState,
  ): Promise<EngineResponse> {
    switch (request.$class) {
      case 'org.accordproject.paymentuponiot@0.2.0.ContractSigned': {
        if (state.status !== 'INITIALIZED') {
          throw new Error('Contract must be in INITIALIZED state to be signed.');
        }
        state.status = 'RUNNING';
        return {
          result: {
            $class: 'org.accordproject.paymentuponiot@0.2.0.CounterResponse',
            counter: state.counter,
            paymentCount: state.paymentCount,
          },
          state,
          events: [],
        };
      }

      case 'org.accordproject.paymentuponiot@0.2.0.SingleButtonPress': {
        if (state.status !== 'RUNNING') {
          throw new Error('Contract must be in RUNNING state to process button presses.');
        }
        state.counter += 1;
        return {
          result: {
            $class: 'org.accordproject.paymentuponiot@0.2.0.CounterResponse',
            counter: state.counter,
            paymentCount: state.paymentCount,
          },
          state,
          events: [],
        };
      }

      case 'org.accordproject.paymentuponiot@0.2.0.DoubleButtonPress': {
        if (state.status !== 'RUNNING') {
          throw new Error('Contract must be in RUNNING state to process button presses.');
        }
        state.counter = Math.max(0, state.counter - 1); // Ensure counter doesn't go below zero
        return {
          result: {
            $class: 'org.accordproject.paymentuponiot@0.2.0.CounterResponse',
            counter: state.counter,
            paymentCount: state.paymentCount,
          },
          state,
          events: [],
        };
      }

      case 'org.accordproject.paymentuponiot@0.2.0.LongButtonPress': {
        if (state.status !== 'RUNNING') {
          throw new Error('Contract must be in RUNNING state to process button presses.');
        }

        if (state.paymentCount >= data.paymentCount) {
          throw new Error('Maximum payment count reached. No more payments can be made.');
        }

        if (state.counter === 0) {
          throw new Error('No short button presses recorded to trigger a payment.');
        }

        const paymentAmount = {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: data.amountPerUnit.doubleValue * state.counter,
          currencyCode: data.amountPerUnit.currencyCode,
        };

        state.paymentCount += 1;

        const events = [
          {
            $class: 'org.accordproject.paymentuponiot@0.2.0.PaymentObligationEvent',
            amount: paymentAmount,
            description: `Payment for ${state.counter} short button presses.`,
            $timestamp: new Date(),
          },
        ];

        if (state.paymentCount >= data.paymentCount) {
          state.status = 'COMPLETED';
        }

        return {
          result: {
            $class: 'org.accordproject.paymentuponiot@0.2.0.CounterResponse',
            counter: state.counter,
            paymentCount: state.paymentCount,
          },
          state,
          events,
        };
      }

      case 'org.accordproject.paymentuponiot@0.2.0.PaymentReceived': {
        if (state.status !== 'RUNNING' && state.status !== 'COMPLETED') {
          throw new Error('Contract must be in RUNNING or COMPLETED state to receive payments.');
        }

        // Assuming payment received clears the counter for the units paid
        // This logic might need refinement based on exact business rules
        const unitsPaid = request.amount.doubleValue / data.amountPerUnit.doubleValue;
        state.counter = Math.max(0, state.counter - unitsPaid);

        return {
          result: {
            $class: 'org.accordproject.paymentuponiot@0.2.0.CounterResponse',
            counter: state.counter,
            paymentCount: state.paymentCount,
          },
          state,
          events: [],
        };
      }

      default: {
        throw new Error(`Unknown request type: ${request.$class}`);
      }
    }
  }
}
