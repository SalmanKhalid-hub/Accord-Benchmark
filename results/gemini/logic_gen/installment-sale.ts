// @ts-ignore
class InstallmentSaleLogic extends TemplateLogic<ITemplateModel, IInstallmentSaleState> {
  async init(data: ITemplateModel): Promise<InitResponse<IInstallmentSaleState>> {
    return {
      state: {
        $class: 'org.accordproject.installmentsale.InstallmentSaleState',
        $identifier: data.$identifier,
        status: 'WaitingForFirstDayOfNextMonth',
        balance_remaining: {
          $class: 'org.accordproject.money.MonetaryAmount',
          doubleValue: data.TOTAL_DUE_BEFORE_CLOSING.doubleValue,
          currencyCode: data.TOTAL_DUE_BEFORE_CLOSING.currencyCode,
        },
        next_payment_month: data.FIRST_MONTH,
        total_paid: {
          $class: 'org.accordproject.money.MonetaryAmount',
          doubleValue: 0.0,
          currencyCode: data.TOTAL_DUE_BEFORE_CLOSING.currencyCode,
        },
      },
    };
  }

  async trigger(
    data: ITemplateModel,
    request: Request,
    state: IInstallmentSaleState,
    emit: (event: object) => void,
  ): Promise<EngineResponse> {
    if (state.status === 'Fulfilled') {
      throw new Error('Contract is already fulfilled.');
    }

    if (request.$class === 'org.accordproject.installmentsale.Installment') {
      const installmentRequest = request as IInstallment;
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // getMonth() is 0-indexed

      if (currentMonth < state.next_payment_month) {
        throw new Error(
          `Installment payment is not due yet. Next payment due in month ${state.next_payment_month}.`,
        );
      }

      if (
        installmentRequest.amount.currencyCode !==
        state.balance_remaining.currencyCode
      ) {
        throw new Error('Currency mismatch for installment payment.');
      }

      if (
        installmentRequest.amount.doubleValue < data.MIN_PAYMENT.doubleValue &&
        state.balance_remaining.doubleValue > data.MIN_PAYMENT.doubleValue
      ) {
        throw new Error(
          `Installment payment must be at least ${data.MIN_PAYMENT.doubleValue} ${data.MIN_PAYMENT.currencyCode}.`,
        );
      }

      const interestRatePerMonth = data.INTEREST_RATE / 12 / 100;
      const interestAmount =
        state.balance_remaining.doubleValue * interestRatePerMonth;
      const principalPaid =
        installmentRequest.amount.doubleValue - interestAmount;

      if (principalPaid < 0) {
        throw new Error(
          'Payment is less than the accrued interest. Please pay more.',
        );
      }

      const newBalanceRemaining =
        state.balance_remaining.doubleValue - principalPaid;
      const newTotalPaid =
        state.total_paid.doubleValue + installmentRequest.amount.doubleValue;

      const events: InstallmentSalePaymentEvent[] = [];
      events.push({
        $class: 'org.accordproject.installmentsale.InstallmentSalePaymentEvent',
        $timestamp: now,
        amount: installmentRequest.amount,
        description: `Installment payment received. Principal: ${principalPaid.toFixed(
          2,
        )}, Interest: ${interestAmount.toFixed(2)}.`,
      });

      let newStatus: ContractStatus = 'WaitingForFirstDayOfNextMonth';
      if (newBalanceRemaining <= 0.001) {
        // Allow for floating point inaccuracies
        newStatus = 'Fulfilled';
        events.push({
          $class: 'org.accordproject.installmentsale.InstallmentSalePaymentEvent',
          $timestamp: now,
          amount: {
            $class: 'org.accordproject.money.MonetaryAmount',
            doubleValue: 0.0,
            currencyCode: data.TOTAL_DUE_BEFORE_CLOSING.currencyCode,
          },
          description: 'Contract fulfilled.',
        });
      }

      return {
        state: {
          ...state,
          status: newStatus,
          balance_remaining: {
            ...state.balance_remaining,
            doubleValue: Math.max(0, newBalanceRemaining),
          },
          next_payment_month: currentMonth === 12 ? 1 : currentMonth + 1,
          total_paid: {
            ...state.total_paid,
            doubleValue: newTotalPaid,
          },
        },
        events: events,
        result: {
          $class: 'org.accordproject.installmentsale.Balance',
          balance: {
            ...state.balance_remaining,
            doubleValue: Math.max(0, newBalanceRemaining),
          },
          balanceCurrency: state.balance_remaining.currencyCode,
          total_paid: {
            ...state.total_paid,
            doubleValue: newTotalPaid,
          },
          totalPaidCurrency: state.total_paid.currencyCode,
        },
      };
    } else if (request.$class === 'org.accordproject.installmentsale.ClosingPayment') {
      const closingPaymentRequest = request as IClosingPayment;
      const now = new Date();

      if (
        closingPaymentRequest.amount.currencyCode !==
        data.DUE_AT_CLOSING.currencyCode
      ) {
        throw new Error('Currency mismatch for closing payment.');
      }

      if (
        closingPaymentRequest.amount.doubleValue < data.DUE_AT_CLOSING.doubleValue
      ) {
        throw new Error(
          `Closing payment must be at least ${data.DUE_AT_CLOSING.doubleValue} ${data.DUE_AT_CLOSING.currencyCode}.`,
        );
      }

      const newTotalPaid =
        state.total_paid.doubleValue + closingPaymentRequest.amount.doubleValue;

      const events: InstallmentSalePaymentEvent[] = [];
      events.push({
        $class: 'org.accordproject.installmentsale.InstallmentSalePaymentEvent',
        $timestamp: now,
        amount: closingPaymentRequest.amount,
        description: 'Closing payment received.',
      });

      return {
        state: {
          ...state,
          status: 'Fulfilled',
          balance_remaining: {
            ...state.balance_remaining,
            doubleValue: 0.0,
          },
          total_paid: {
            ...state.total_paid,
            doubleValue: newTotalPaid,
          },
        },
        events: events,
        result: {
          $class: 'org.accordproject.installmentsale.Balance',
          balance: {
            ...state.balance_remaining,
            doubleValue: 0.0,
          },
          balanceCurrency: state.balance_remaining.currencyCode,
          total_paid: {
            ...state.total_paid,
            doubleValue: newTotalPaid,
          },
          totalPaidCurrency: state.total_paid.currencyCode,
        },
      };
    } else {
      throw new Error(`Unknown request type: ${request.$class}`);
    }
  }
}

import {
  ITemplateModel,
  IInstallment,
  IClosingPayment,
  IInstallmentSaleState,
  InstallmentSalePaymentEvent,
  ContractStatus,
} from './generated/org.accordproject.installmentsale@0.2.0';

export default InstallmentSaleLogic;
