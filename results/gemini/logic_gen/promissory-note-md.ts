import { ITemplateModel, IPayment, IResult } from './generated/org.accordproject.promissorynotemd@0.2.0';
import { CurrencyCode } from './generated/org.accordproject.money@0.3.0';

// @ts-ignore
class PromissoryNoteLogic extends TemplateLogic<ITemplateModel> {
    /**
     * The trigger function
     * @param data The clause data
     * @param request The request
     */
    async trigger(data: ITemplateModel, request: IPayment): Promise<{ result: IResult }> {
        const outstandingBalance = data.amount.doubleValue - request.amountPaid.doubleValue;

        return {
            result: {
                $class: 'org.accordproject.promissorynotemd@0.2.0.Result',
                $timestamp: new Date(),
                outstandingBalance: {
                    $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
                    doubleValue: outstandingBalance,
                    currencyCode: data.amount.currencyCode as CurrencyCode,
                },
            },
        };
    }
}

default export PromissoryNoteLogic;
