import { ITemplateModel, IFixedInterestsStaticRequest, IFixedInterestsStaticResponse } from './generated/org.accordproject.fixedinterestsstatic@0.2.0';

class FixedInterestsStaticLogic extends TemplateLogic<ITemplateModel> {
  // @ts-ignore
  async trigger(data: ITemplateModel, request: IFixedInterestsStaticRequest): Promise<{ result: IFixedInterestsStaticResponse }> {
    const result: IFixedInterestsStaticResponse = {
      $class: 'org.accordproject.fixedinterestsstatic@0.2.0.FixedInterestsStaticResponse',
      $timestamp: new Date(),
      output: 'This is a fixed interest loan to the amount of 100,000.00 USD at the yearly interest rate of 2.5% with a loan term of 15, and monthly payments of 667.00 USD'
    };

    return { result };
  }
}

export default FixedInterestsStaticLogic;
