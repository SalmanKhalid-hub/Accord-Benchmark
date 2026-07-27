import { ITemplateModel, IPaymentRequest, IPayOut } from './generated/org.accordproject.carrentaltr@0.2.0';
import { CurrencyCode } from './generated/org.accordproject.money@0.3.0';

// @ts-ignore
class CarRentalLogic extends TemplateLogic<ITemplateModel> {
    /**
     * The trigger function
     * @param {ITemplateModel} data The clause data
     * @param {IPaymentRequest} request The incoming request
     * @return {Promise<{ result: IPayOut }>} The response
     */
    async trigger(data: ITemplateModel, request: IPaymentRequest): Promise<{ result: IPayOut }> {
        const amount = data.paymentClause.amount;

        return {
            result: {
                $class: 'org.accordproject.carrentaltr@0.2.0.PayOut',
                $timestamp: new Date(),
                amount: {
                    $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
                    doubleValue: amount.doubleValue,
                    currencyCode: amount.currencyCode,
                },
            },
        };
    }
}

default export CarRentalLogic;
