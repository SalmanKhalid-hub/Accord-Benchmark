import { ITemplateModel, IInstallment, IClosingPayment, IInstallmentSaleState, IBalance, IInstallmentSalePaymentEvent, ContractStatus } from './generated/org.accordproject.installmentsale@0.2.0';

class InstallmentSaleLogicBase extends TemplateLogic<ITemplateModel, IInstallmentSaleState> {
  async init(data: ITemplateModel): Promise<InitResponse<IInstallmentSaleState>> {
    return {
      state: {
        $class: 'org.accordproject.installmentsale@0.2.0.InstallmentSaleState',
        $identifier: data.$identifier,
        status: ContractStatus.WaitingForFirstDayOfNextMonth,
        balance_remaining: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: data.TOTAL_DUE_BEFORE_CLOSING.doubleValue - data.DUE_AT_CLOSING.doubleValue,
          currencyCode: data.TOTAL_DUE_BEFORE_CLOSING.currencyCode
        },
        next_payment_month: data.FIRST_MONTH,
        total_paid: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: data.DUE_AT_CLOSING.doubleValue,
          currencyCode: data.DUE_AT_CLOSING.currencyCode
        }
      }
    };
  }

  async trigger(
    data: ITemplateModel,
    request: IInstallment | IClosingPayment,
    state: IInstallmentSaleState
  ): Promise<EngineResponse<IBalance, IInstallmentSaleState>> {
    if (state.status === ContractStatus.Fulfilled) {
      throw new Error('Contract has been fulfilled');
    }

    const currencyCode = state.balance_remaining.currencyCode;

    if (request.$class === 'org.accordproject.installmentsale@0.2.0.ClosingPayment') {
      if (state.status !== ContractStatus.WaitingForFirstDayOfNextMonth) {
        throw new Error('Closing payment is not allowed in the current state');
      }
      const amount = request.amount;
      if (amount.currencyCode !== currencyCode) {
        throw new Error('Currency mismatch');
      }
      if (Math.abs(amount.doubleValue - data.DUE_AT_CLOSING.doubleValue) > 1e-9) {
        throw new Error('Incorrect closing payment amount');
      }

      const newTotalPaid = {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: state.total_paid.doubleValue + amount.doubleValue,
        currencyCode
      };

      const newBalance = {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: state.balance_remaining.doubleValue,
        currencyCode
      };

      return {
        result: {
          $class: 'org.accordproject.installmentsale@0.2.0.Balance',
          balance: newBalance,
          balanceCurrency: currencyCode,
          total_paid: newTotalPaid,
          totalPaidCurrency: currencyCode
        },
        state: {
          ...state,
          total_paid: newTotalPaid,
          balance_remaining: newBalance
        },
        events: [
          {
            $class: 'org.accordproject.installmentsale@0.2.0.InstallmentSalePaymentEvent',
            amount: amount,
            description: 'Closing payment received'
          }
        ]
      };
    }

    if (request.$class === 'org.accordproject.installmentsale@0.2.0.Installment') {
      if (state.status !== ContractStatus.WaitingForFirstDayOfNextMonth) {
        throw new Error('Installment payment is not allowed in the current state');
      }
      const amount = request.amount;
      if (amount.currencyCode !== currencyCode) {
        throw new Error('Currency mismatch');
      }
      if (amount.doubleValue < data.MIN_PAYMENT.doubleValue) {
        throw new Error('Installment payment is below the minimum payment');
      }

      const interest = state.balance_remaining.doubleValue * (data.INTEREST_RATE / 100.0);
      const appliedAmount = amount.doubleValue;
      const newBalanceValue = Math.max(0, state.balance_remaining.doubleValue + interest - appliedAmount);

      const newBalance = {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: newBalanceValue,
        currencyCode
      };

      const newTotalPaid = {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: state.total_paid.doubleValue + appliedAmount,
        currencyCode
      };

      const newStatus = newBalanceValue <= 0 ? ContractStatus.Fulfilled : ContractStatus.WaitingForFirstDayOfNextMonth;

      return {
        result: {
          $class: 'org.accordproject.installmentsale@0.2.0.Balance',
          balance: newBalance,
          balanceCurrency: currencyCode,
          total_paid: newTotalPaid,
          totalPaidCurrency: currencyCode
        },
        state: {
          ...state,
          status: newStatus,
          balance_remaining: newBalance,
          total_paid: newTotalPaid
        },
        events: [
          {
            $class: 'org.accordproject.installmentsale@0.2.0.InstallmentSalePaymentEvent',
            amount: amount,
            description: 'Monthly installment received'
          }
        ]
      };
    }

    throw new Error(`Unsupported transaction type: ${request.$class}`);
  }
}

export default InstallmentSaleLogicBase;
