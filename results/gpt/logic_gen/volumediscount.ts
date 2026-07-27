import { ITemplateModel, IVolumeDiscountRequest, IVolumeDiscountResponse } from './generated/org.accordproject.volumediscount@0.2.0';

export default class VolumeDiscountLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IVolumeDiscountRequest): Promise<{ result: IVolumeDiscountResponse }> {
    const volume = request.netAnnualChargeVolume.doubleValue;
    let discountRate: number;

    if (volume < 1000000) {
      discountRate = data.firstRate;
    } else if (volume <= 10000000) {
      discountRate = data.secondRate;
    } else {
      discountRate = data.thirdRate;
    }

    return {
      result: {
        $class: 'org.accordproject.volumediscount@0.2.0.VolumeDiscountResponse',
        $timestamp: new Date(),
        discountRate
      }
    };
  }
}
