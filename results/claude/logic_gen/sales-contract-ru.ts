import {
  ITemplateModel,
  IMyRequest,
  IMyResponse,
} from './generated/org.accordproject.salescontractru@0.1.0';

// @ts-ignore
class SalesContractRuLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: IMyRequest
  ): Promise<{ result: IMyResponse }> {
    const output = `Sales Contract (Договор Купли-продажи) processed:
- Seller: ${data.seller}
- Buyer: ${data.buyer}
- Refund Period: ${data.refundPeriod}
- Currency: ${data.currencyType}
- Appeal Period: ${data.appealPeriod}
- Legislation: ${data.countryLegislation}
- Counterparty: ${data.counterparty}
- Request Input: ${request.input}`;

    return {
      result: {
        $class: 'org.accordproject.salescontractru@0.1.0.MyResponse',
        $timestamp: new Date(),
        output: output,
      },
    };
  }
}

export default SalesContractRuLogic;
