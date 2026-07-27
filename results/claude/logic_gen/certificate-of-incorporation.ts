// @ts-ignore
class CertificateOfIncorporationLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IRequest): Promise<{ result: IResponse }> {
    const event: IncorporationEvent = {
      $class: 'org.accordproject.certificateofincorporation@0.1.0.IncorporationEvent',
      companyName: data.companyName,
      incorporationDate: data.incorporationDate,
      authorizedShareCapital: data.authorizedShareCapital,
      parValue: data.parValue,
    };

    const response: IResponse = {
      $class: 'org.accordproject.certificateofincorporation@0.1.0.Response',
      $timestamp: new Date(),
    };

    return { result: response };
  }
}

export default CertificateOfIncorporationLogic;
