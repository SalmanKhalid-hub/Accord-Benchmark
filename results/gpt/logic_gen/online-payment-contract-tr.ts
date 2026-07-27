import { ITemplateModel } from './generated/org.accordproject.onlinepaymentcontracttr@0.1.0';
import { IMyRequest } from './generated/org.accordproject.onlinepaymentcontracttr@0.1.0';
import { IMyResponse } from './generated/org.accordproject.onlinepaymentcontracttr@0.1.0';

// @ts-ignore
export default class OnlinePaymentContractTRLogic extends TemplateLogic<ITemplateModel> {
  public async trigger(data: ITemplateModel, request: IMyRequest): Promise<{ result: IMyResponse }> {
    const input = request.input;

    let output = '';

    if (input === data.buyer) {
      output = `ALICI: ${data.buyer}, SATICI: ${data.seller}, yazılım: ${data.softwareID}, kullanıcı sayısı: ${data.userCount}, yetkili mahkeme: ${data.authorizedCourt}.`;
    } else if (input === data.seller) {
      output = `SATICI: ${data.seller}, ALICI: ${data.buyer}, yazılım: ${data.softwareID}, kullanıcı sayısı: ${data.userCount}, yetkili mahkeme: ${data.authorizedCourt}.`;
    } else {
      output = `Taraflar: ALICI ${data.buyer} ve SATICI ${data.seller}. Yazılım ${data.softwareID} için ${data.userCount} kullanıcı lisansı ve yetkili mahkeme ${data.authorizedCourt}.`;
    }

    return {
      result: {
        $class: 'org.accordproject.onlinepaymentcontracttr@0.1.0.MyResponse',
        $timestamp: new Date(),
        output
      }
    };
  }
}
