import { ITemplateModel, ILateInvoiceRequest, ILateInvoiceResponse } from './generated/org.accordproject.lateinvoicewithpayment@0.2.0';

// @ts-ignore
class LateInvoiceLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: ILateInvoiceRequest): Promise<{ result: ILateInvoiceResponse }> {
    const invoiceDueDate = new Date(request.invoiceDue);
    const currentDate = new Date();
    
    // Calculate the time difference in milliseconds
    const timeDifferenceMs = currentDate.getTime() - invoiceDueDate.getTime();
    
    // Convert maximumDelay to milliseconds
    const maximumDelayMs = this.durationToMilliseconds(data.maximumDelay);
    
    // Determine if payment is required
    const paymentRequired = timeDifferenceMs <= maximumDelayMs;
    
    let cause: string | undefined;
    if (!paymentRequired) {
      cause = `Invoice was issued more than ${data.maximumDelay.amount} ${data.maximumDelay.unit} after the due date`;
    }
    
    const response: ILateInvoiceResponse = {
      $class: 'org.accordproject.latinvoicewithpayment@0.2.0.LateInvoiceResponse',
      $timestamp: new Date(),
      paymentRequired,
      cause
    };
    
    return { result: response };
  }
  
  private durationToMilliseconds(duration: any): number {
    const amount = duration.amount;
    const unit = duration.unit;
    
    switch (unit) {
      case 'MILLIS':
        return amount;
      case 'SECONDS':
        return amount * 1000;
      case 'MINUTES':
        return amount * 60 * 1000;
      case 'HOURS':
        return amount * 60 * 60 * 1000;
      case 'DAYS':
        return amount * 24 * 60 * 60 * 1000;
      case 'WEEKS':
        return amount * 7 * 24 * 60 * 60 * 1000;
      case 'MONTHS':
        return amount * 30 * 24 * 60 * 60 * 1000;
      case 'YEARS':
        return amount * 365 * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }
}

export default LateInvoiceLogic;
