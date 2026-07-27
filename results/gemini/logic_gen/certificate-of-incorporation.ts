// @ts-ignore
class MyTemplateLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IRequest): Promise<{ result: IResponse }> {
    const response: IIncorporationEvent = {
      $class: 'org.accordproject.certificateofincorporation@0.1.0.IncorporationEvent',
      companyName: data.companyName,
      incorporationDate: data.incorporationDate,
      authorizedShareCapital: data.authorizedShareCapital,
      parValue: data.parValue,
    };

    return {
      result: {
        $class: 'org.accordproject.certificateofincorporation@0.1.0.Response',
        $timestamp: new Date(),
        event: response,
      },
    };
  }
}

export default MyTemplateLogic;

import {
  ITemplateModel,
  IRequest,
  IResponse,
  IIncorporationEvent,
} from './generated/org.accordproject.certificateofincorporation@0.1.0';
