import { ITemplateModel } from './generated/org.accordproject.certificateofincorporation@0.1.0';
import { IRequest, IResponse } from './generated/org.accordproject.runtime@0.2.0';

// @ts-ignore
export default class CertificateOfIncorporationLogic extends TemplateLogic<ITemplateModel> {
  public async trigger(data: ITemplateModel, request: IRequest): Promise<{ result: IResponse }> {
    const result: IResponse = {
      $class: 'org.accordproject.certificateofincorporation@0.1.0.Response',
      $timestamp: new Date()
    } as IResponse;

    return { result };
  }
}
