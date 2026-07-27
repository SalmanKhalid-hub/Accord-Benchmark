import { ITemplateModel } from './generated/org.accordproject.rentaldepositwith@0.2.0';
import { IProperyInspection } from './generated/org.accordproject.rentaldepositwith@0.2.0';
import { IPropertyInspectionResponse } from './generated/org.accordproject.rentaldepositwith@0.2.0';

// @ts-ignore
class RentalDepositWithLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IProperyInspection): Promise<{ result: IPropertyInspectionResponse }> {
    let total = 0;

    if (request && Array.isArray(request.penalties)) {
      for (const penalty of request.penalties) {
        if (penalty && penalty.amount && typeof penalty.amount.doubleValue === 'number') {
          total += penalty.amount.doubleValue;
        }
      }
    }

    const response: IPropertyInspectionResponse = {
      $class: 'org.accordproject.rentaldepositwith@0.2.0.PropertyInspectionResponse',
      $timestamp: new Date(),
      balance: {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: total,
        currencyCode: data.depositAmount.currencyCode
      }
    };

    return { result: response };
  }
}

export default RentalDepositWithLogic;
