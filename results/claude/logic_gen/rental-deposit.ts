import {
  ITemplateModel,
  IProperyInspection,
  IPropertyInspectionResponse,
} from './generated/org.accordproject.rentaldeposit@0.2.0';

// @ts-ignore
class RentalDepositLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: IProperyInspection
  ): Promise<{ result: IPropertyInspectionResponse }> {
    // Start with the original deposit amount
    let balance = data.depositAmount.doubleValue;

    // Deduct all penalties from the balance
    if (request.penalties && request.penalties.length > 0) {
      for (const penalty of request.penalties) {
        balance -= penalty.amount.doubleValue;
      }
    }

    // Ensure balance doesn't go below zero
    if (balance < 0) {
      balance = 0;
    }

    const response: IPropertyInspectionResponse = {
      $class: 'org.accordproject.rentaldeposit@0.2.0.PropertyInspectionResponse',
      $timestamp: new Date(),
      balance: {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: balance,
        currencyCode: data.depositAmount.currencyCode,
      },
    };

    return { result: response };
  }
}

export default RentalDepositLogic;
