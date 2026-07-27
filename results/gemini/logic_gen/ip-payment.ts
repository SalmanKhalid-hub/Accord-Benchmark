import { ITemplateModel, IPaymentRequest, IPayOut } from './generated/org.accordproject.ippayment@0.2.0';
import { MonetaryAmount } from './generated/org.accordproject.money@0.3.0';

// @ts-ignore
class IPPaymentLogic extends TemplateLogic<ITemplateModel> {
    async trigger(data: ITemplateModel, request: IPaymentRequest): Promise<{ result: IPayOut }> {
        const royaltyAmount = request.netSaleRevenue * data.royaltyRate;
        const sublicensingAmount = request.sublicensingRevenue * data.sublicensingRoyaltyRate;
        const totalAmount = royaltyAmount + sublicensingAmount;

        let dueDate: Date;
        if (request.permissionGrantedBy) {
            dueDate = new Date(request.permissionGrantedBy.getTime());
            dueDate.setDate(dueDate.getDate() + data.paymentPeriodWithPermission.amount);
        } else {
            dueDate = new Date(); // Assuming current date as the start for calculation if no permission date
            dueDate.setDate(dueDate.getDate() + data.paymentPeriod.amount);
        }

        const payOut: IPayOut = {
            $class: 'org.accordproject.ippayment@0.2.0.PayOut',
            $timestamp: new Date(),
            totalAmount: {
                $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
                doubleValue: totalAmount,
                currencyCode: 'USD'
            } as MonetaryAmount,
            dueBy: dueDate
        };

        return { result: payOut };
    }
}

export default IPPaymentLogic;
