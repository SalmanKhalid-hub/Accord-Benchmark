// @ts-ignore
class RentalDepositLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: IProperyInspection
  ): Promise<{ result: IPropertyInspectionResponse }> {
    let balance = data.depositAmount.doubleValue;

    for (const penalty of request.penalties) {
      balance -= penalty.amount.doubleValue;
    }

    return {
      result: {
        $class:
          'org.accordproject.rentaldeposit@0.2.0.PropertyInspectionResponse',
        $timestamp: new Date(),
        balance: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: balance,
          currencyCode: data.depositAmount.currencyCode,
        },
      },
    };
  }
}

declare const TemplateLogic: any;
import {
  ITemplateModel,
  IProperyInspection,
  IPropertyInspectionResponse,
} from './generated/org.accordproject.rentaldeposit@0.2.0';
import { CurrencyCode } from './generated/org.accordproject.money@0.3.0';

export default RentalDepositLogic;
