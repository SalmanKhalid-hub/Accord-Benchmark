// @ts-ignore
class LateInvoiceWithPaymentLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ILateInvoiceRequest): Promise<{ result: ILateInvoiceResponse }> {
    const invoiceDue = request.invoiceDue;
    const now = new Date();

    const maximumDelayMillis = data.maximumDelay.amount * this.getUnitMultiplier(data.maximumDelay.unit);
    const invoiceDuePlusMaxDelay = new Date(invoiceDue.getTime() + maximumDelayMillis);

    let paymentRequired = true;
    let cause: string | undefined;

    if (now.getTime() > invoiceDuePlusMaxDelay.getTime()) {
      paymentRequired = false;
      cause = `${data.purchaser} is not required to pay because the invoice was issued more than ${data.maximumDelay.amount} ${data.maximumDelay.unit} after it was due.`;
    }

    return {
      result: {
        $class: 'org.accordproject.lateinvoicewithpayment@0.2.0.LateInvoiceResponse',
        $timestamp: new Date(),
        paymentRequired: paymentRequired,
        cause: cause,
      },
    };
  }

  private getUnitMultiplier(unit: TemporalUnit): number {
    switch (unit) {
      case 'DAYS':
        return 24 * 60 * 60 * 1000; // milliseconds in a day
      case 'HOURS':
        return 60 * 60 * 1000; // milliseconds in an hour
      case 'MINUTES':
        return 60 * 1000; // milliseconds in a minute
      case 'SECONDS':
        return 1000; // milliseconds in a second
      case 'WEEKS':
        return 7 * 24 * 60 * 60 * 1000; // milliseconds in a week
      case 'MONTHS':
        // Approximating a month as 30 days for simplicity,
        // but in a real-world scenario, this might need more complex date calculations.
        return 30 * 24 * 60 * 60 * 1000;
      case 'YEARS':
        return 365 * 24 * 60 * 60 * 1000; // milliseconds in a year (ignoring leap years)
      default:
        throw new Error(`Unsupported temporal unit: ${unit}`);
    }
  }
}

import {
  ITemplateModel,
  ILateInvoiceRequest,
  ILateInvoiceResponse,
} from './generated/org.accordproject.lateinvoicewithpayment@0.2.0';
import { TemporalUnit } from './generated/org.accordproject.time@0.3.0';

default export LateInvoiceWithPaymentLogic;
