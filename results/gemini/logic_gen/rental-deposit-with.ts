import { ITemplateModel, IProperyInspection, IPropertyInspectionResponse, Penalty } from './generated/org.accordproject.rentaldepositwith@0.2.0';
import { MonetaryAmount, CurrencyCode } from './generated/org.accordproject.money@0.3.0';

// @ts-ignore
class RentalDepositWithLogic extends TemplateLogic<ITemplateModel> {
    async trigger(data: ITemplateModel, request: IProperyInspection): Promise<{ result: IPropertyInspectionResponse }> {
        let totalPenalties: number = 0;
        if (request.penalties) {
            for (const penalty of request.penalties) {
                totalPenalties += penalty.amount.doubleValue;
            }
        }

        const depositAmount = data.depositAmount.doubleValue;
        const currencyCode = data.depositAmount.currencyCode;

        const balance = depositAmount - totalPenalties;

        return {
            result: {
                $class: 'org.accordproject.rentaldepositwith@0.2.0.PropertyInspectionResponse',
                $timestamp: new Date(),
                balance: {
                    $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
                    doubleValue: balance,
                    currencyCode: currencyCode,
                },
            },
        };
    }
}

export default RentalDepositWithLogic;
