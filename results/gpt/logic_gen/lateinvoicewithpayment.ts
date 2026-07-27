import { ITemplateModel, ILateInvoiceRequest, ILateInvoiceResponse } from './generated/org.accordproject.lateinvoicewithpayment@0.2.0';

class LateInvoiceLogicImpl extends TemplateLogic<ITemplateModel> {
  public async trigger(data: ITemplateModel, request: ILateInvoiceRequest): Promise<{ result: ILateInvoiceResponse }> {
    const maxDelay = data.maximumDelay;
    const dueDate = request.invoiceDue;

    const msPerDay = 24 * 60 * 60 * 1000;
    const delayMs =
      (maxDelay && (maxDelay as any).amount !== undefined && (maxDelay as any).unit !== undefined)
        ? this.durationToMilliseconds(maxDelay as any)
        : 180 * msPerDay;

    const issuedLate = dueDate.getTime() < (new Date().getTime() - delayMs);

    const response: ILateInvoiceResponse = {
      $class: 'org.accordproject.lateinvoicewithpayment@0.2.0.LateInvoiceResponse',
      $timestamp: new Date(),
      paymentRequired: !issuedLate
    };

    if (issuedLate) {
      response.cause = `Invoice issued more than 180 days after it was due to be issued by ${data.supplier}`;
    }

    return { result: response };
  }

  private durationToMilliseconds(duration: any): number {
    const amount = Number(duration.amount);
    const unit = duration.unit;

    switch (unit) {
      case 'days':
      case 'day':
        return amount * 24 * 60 * 60 * 1000;
      case 'hours':
      case 'hour':
        return amount * 60 * 60 * 1000;
      case 'minutes':
      case 'minute':
        return amount * 60 * 1000;
      case 'seconds':
      case 'second':
        return amount * 1000;
      case 'milliseconds':
      case 'millisecond':
        return amount;
      default:
        return amount * 24 * 60 * 60 * 1000;
    }
  }
}

// @ts-ignore
export default LateInvoiceLogicImpl;
