import { ITemplateModel } from './generated/org.accordproject.rentaldeposit@0.2.0';
import { IProperyInspection } from './generated/org.accordproject.rentaldeposit@0.2.0';
import { IPropertyInspectionResponse } from './generated/org.accordproject.rentaldeposit@0.2.0';

class RentalDepositLogic extends TemplateLogic<ITemplateModel> {
  // @ts-ignore
  public async trigger(data: ITemplateModel, request: IProperyInspection): Promise<{ result: IPropertyInspectionResponse }> {
    const deposit = data.depositAmount;
    let balance = deposit.doubleValue;

    for (const penalty of request.penalties || []) {
      if (penalty && penalty.amount) {
        balance -= penalty.amount.doubleValue;
      }
    }

    if (balance < 0) {
      balance = 0;
    }

    return {
      result: {
        $class: 'org.accordproject.rentaldeposit@0.2.0.PropertyInspectionResponse',
        $timestamp: new Date(),
        balance: {
          $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
          doubleValue: balance,
          currencyCode: deposit.currencyCode
        }
      }
    };
  }
}

export default RentalDepositLogic;
