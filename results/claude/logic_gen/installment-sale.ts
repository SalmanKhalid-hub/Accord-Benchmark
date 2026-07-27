import {
  ITemplateModel,
  IInstallmentSaleState,
  IInstallment,
  IClosingPayment,
  IBalance,
  IInstallmentSalePaymentEvent,
  ContractStatus,
} from './generated/org.accordproject.installmentsale@0.2.0';

// @ts-ignore
class InstallmentSaleLogic extends TemplateLogic<ITemplateModel, IInstallmentSaleState> {
  async init(data: ITemplateModel): Promise<InitResponse<IInstallmentSaleState>> {
    const initialBalance = {
      $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
      doubleValue: data.TOTAL_DUE_BEFORE_CLOSING.doubleValue,
      currencyCode: data.TOTAL_DUE_BEFORE_CLOSING.currencyCode,
    };

    const initialTotalPaid = {
      $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
      doubleValue: 0,
      currencyCode: data.INITIAL_DUE.currencyCode,
    };

    return {
      state: {
        $class: 'org.accordproject.installmentsale@0.2.0.InstallmentSaleState',
        $identifier: data.$identifier,
        status: ContractStatus.WaitingForFirstDayOfNextMonth,
        balance_remaining: initialBalance,
        next_payment_month: data.FIRST_MONTH,
        total_paid: initialTotalPaid,
      },
    };
  }

  async trigger(
    data: ITemplateModel,
    request: IInstallment | IClosingPayment | IBalance,
    state: IInstallmentSaleState
  ): Promise<EngineResponse<IInstallmentSaleState>> {
    if (request.$class === 'org.accordproject.installmentsale@0.2.0.ClosingPayment') {
      const closingPayment = request as IClosingPayment;

      if (state.status !== ContractStatus.WaitingForFirstDayOfNextMonth) {
        throw new Error(
          `Cannot process closing payment in status ${state.status}`
        );
      }

      const paymentAmount = closingPayment.amount.doubleValue;
      const dueAmount = data.DUE_AT_CLOSING.doubleValue;

      if (paymentAmount < dueAmount) {
        throw new Error(
          `Closing payment of ${paymentAmount} is less than due amount of ${dueAmount}`
        );
      }

      const newTotalPaid = {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: state.total_paid.doubleValue + paymentAmount,
        currencyCode: state.total_paid.currencyCode,
      };

      const newBalance = {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: state.balance_remaining.doubleValue,
        currencyCode: state.balance_remaining.currencyCode,
      };

      const event: IInstallmentSalePaymentEvent = {
        $class: 'org.accordproject.installmentsale@0.2.0.InstallmentSalePaymentEvent',
        $identifier: `${data.$identifier}-closing-payment`,
        $timestamp: new Date(),
        amount: closingPayment.amount,
        description: 'Closing payment received',
        contract: data.$identifier,
        promisor: data.BUYER,
        promisee: data.SELLER,
      };

      return {
        result: {},
        state: {
          $class: 'org.accordproject.installmentsale@0.2.0.InstallmentSaleState',
          $identifier: state.$identifier,
          status: ContractStatus.WaitingForFirstDayOfNextMonth,
          balance_remaining: newBalance,
          next_payment_month: state.next_payment_month,
          total_paid: newTotalPaid,
        },
        events: [event],
      };
    } else if (request.$class === 'org.accordproject.installmentsale@0.2.0.Installment') {
      const installment = request as IInstallment;

      if (state.status !== ContractStatus.WaitingForFirstDayOfNextMonth) {
        throw new Error(
          `Cannot process installment in status ${state.status}`
        );
      }

      const paymentAmount = installment.amount.doubleValue;
      const minPayment = data.MIN_PAYMENT.doubleValue;

      if (paymentAmount < minPayment) {
        throw new Error(
          `Installment payment of ${paymentAmount} is less than minimum payment of ${minPayment}`
        );
      }

      const currentBalance = state.balance_remaining.doubleValue;
      const interestRate = data.INTEREST_RATE / 100;
      const monthlyInterest = currentBalance * interestRate;
      const principalPayment = paymentAmount - monthlyInterest;
      const newBalance = Math.max(0, currentBalance - principalPayment);

      const newTotalPaid = {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: state.total_paid.doubleValue + paymentAmount,
        currencyCode: state.total_paid.currencyCode,
      };

      const updatedBalance = {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: newBalance,
        currencyCode: state.balance_remaining.currencyCode,
      };

      let newStatus = ContractStatus.WaitingForFirstDayOfNextMonth;
      if (newBalance <= 0) {
        newStatus = ContractStatus.Fulfilled;
      }

      const event: IInstallmentSalePaymentEvent = {
        $class: 'org.accordproject.installmentsale@0.2.0.InstallmentSalePaymentEvent',
        $identifier: `${data.$identifier}-installment-${state.next_payment_month}`,
        $timestamp: new Date(),
        amount: installment.amount,
        description: `Installment payment for month ${state.next_payment_month}`,
        contract: data.$identifier,
        promisor: data.BUYER,
        promisee: data.SELLER,
      };

      return {
        result: {},
        state: {
          $class: 'org.accordproject.installmentsale@0.2.0.InstallmentSaleState',
          $identifier: state.$identifier,
          status: newStatus,
          balance_remaining: updatedBalance,
          next_payment_month: state.next_payment_month + 1,
          total_paid: newTotalPaid,
        },
        events: [event],
      };
    } else if (request.$class === 'org.accordproject.installmentsale@0.2.0.Balance') {
      const balanceResponse: IBalance = {
        $class: 'org.accordproject.installmentsale@0.2.0.Balance',
        balance: state.balance_remaining,
        balanceCurrency: state.balance_remaining.currencyCode,
        total_paid: state.total_paid,
        totalPaidCurrency: state.total_paid.currencyCode,
      };

      return {
        result: balanceResponse,
        state: state,
        events: [],
      };
    }

    throw new Error(`Unknown request type: ${request.$class}`);
  }
}

export default InstallmentSaleLogic;
