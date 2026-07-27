import {
  ITemplateModel,
  IPaymentRequest,
  IPayOut,
} from './generated/org.accordproject.ippayment@0.2.0';

// @ts-ignore
class IPPaymentLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: IPaymentRequest
  ): Promise<{ result: IPayOut }> {
    // Calculate royalty payment
    const royaltyAmount =
      request.netSaleRevenue * (data.royaltyRate / 100);

    // Calculate sublicensing revenue payment
    const sublicensingAmount =
      request.sublicensingRevenue * (data.sublicensingRoyaltyRate / 100);

    // Total amount due
    const totalDueValue = royaltyAmount + sublicensingAmount;

    // Determine payment period based on whether permission was granted
    let paymentPeriodDays = data.paymentPeriod.amount;
    if (
      request.permissionGrantedBy &&
      data.paymentPeriodWithPermission
    ) {
      paymentPeriodDays = data.paymentPeriodWithPermission.amount;
    }

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + paymentPeriodDays);

    const result: IPayOut = {
      $class: 'org.accordproject.ippayment@0.2.0.PayOut',
      $timestamp: new Date(),
      totalAmount: {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: totalDueValue,
        currencyCode: 'USD',
      },
      dueBy: dueDate,
    };

    return { result };
  }
}

export default IPPaymentLogic;
