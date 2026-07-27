// @ts-ignore
class OnlinePaymentContractTRLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IMyRequest): Promise<{ result: IMyResponse }> {
    const output = `Sözleşme Özeti:
Alıcı: ${data.buyer}
Satıcı: ${data.seller}
Yazılım: ${data.softwareID}
Kullanıcı Sayısı: ${data.userCount}
Yetkili Mahkeme: ${data.authorizedCourt}

Bu sözleşme, ${data.seller} tarafından ${data.buyer}'ya ${data.softwareID} yazılımının ${data.userCount} kullanıcı için satışını düzenlemektedir. Sözleşme hükümleri gereğince, satıcı yazılımın kurulumu, destek ve eğitim hizmetlerini sağlamakla yükümlüdür. Alıcı ise yazılımı yasalara uygun şekilde kullanmakla ve ödemeleri zamanında yapmakla yükümlüdür. Anlaşmazlıklar ${data.authorizedCourt} tarafından çözülecektir.`;

    return {
      result: {
        $class: 'org.accordproject.onlinepaymentcontracttr@0.1.0.MyResponse',
        $timestamp: new Date(),
        output: output
      }
    };
  }
}

export default OnlinePaymentContractTRLogic;
