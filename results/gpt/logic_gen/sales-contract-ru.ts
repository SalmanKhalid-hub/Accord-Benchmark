import { ITemplateModel, IMyRequest, IMyResponse } from './generated/org.accordproject.salescontractru@0.1.0';

// @ts-ignore
export default class SalesContractRuLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IMyRequest): Promise<{ result: IMyResponse }> {
    const output = request.input || '';
    return {
      result: {
        $class: 'org.accordproject.salescontractru@0.1.0.MyResponse',
        $timestamp: new Date(),
        output
      }
    };
  }
}
