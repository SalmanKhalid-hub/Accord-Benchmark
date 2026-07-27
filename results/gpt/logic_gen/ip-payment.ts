import { ITemplateModel, IPaymentRequest, IPayOut } from './generated/org.accordproject.ippayment@0.2.0';

class PaymentsLogicBase extends TemplateLogic<ITemplateModel> {
  // @ts-ignore
  public async trigger(data: ITemplateModel, request: IPaymentRequest): Promise<{ result: IPayOut }> {
    const royaltyAmount = (request.netSaleRevenue || 0) * (data.royaltyRate || 0);
    const sublicensingAmount = (request.sublicensingRevenue || 0) * (data.sublicensingRoyaltyRate || 0);
    const totalAmount = royaltyAmount + sublicensingAmount;

    let dueBy = new Date();
    if (request.permissionGrantedBy) {
      dueBy = new Date(request.permissionGrantedBy);
      dueBy.setDate(dueBy.getDate() + 7);
    } else {
      dueBy.setDate(dueBy.getDate() + 10);
    }

    return {
      result: {
        $class: 'org.accordproject.ippayment@0.2.0.PayOut',
        $timestamp: new Date(),
        totalAmount: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: totalAmount,
          currencyCode: 'USD'
        },
        dueBy
      }
    };
  }
}

// @ts-ignore
export default PaymentsLogicBase;
