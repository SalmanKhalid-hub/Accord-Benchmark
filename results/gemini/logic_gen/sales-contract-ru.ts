// @ts-ignore
class SalesContractRULogic extends TemplateLogic<ITemplateModel> {
  /**
   * The trigger function
   * @param {ITemplateModel} data The clause data
   * @param {MyRequest} request The incoming request
   * @returns {Promise<MyResponse>} The response
   */
  async trigger(
    data: ITemplateModel,
    request: IMyRequest
  ): Promise<{ result: IMyResponse }> {
    const response: IMyResponse = {
      $class: 'org.accordproject.salescontractru@0.1.0.MyResponse',
      $timestamp: new Date(),
      output: `Hello ${data.buyer} and ${data.seller}! You sent: ${request.input}`,
    };
    return { result: response };
  }
}

import {
  ITemplateModel,
  IMyRequest,
  IMyResponse,
} from './generated/org.accordproject.salescontractru@0.1.0';
import { CurrencyCode } from './generated/org.accordproject.money@0.3.0';

export default SalesContractRULogic;
