import {
  ITemplateModel,
  IVolumeDiscountRequest,
  IVolumeDiscountResponse,
} from './generated/org.accordproject.volumediscount@0.2.0';

// @ts-ignore
class VolumeDiscountLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: IVolumeDiscountRequest
  ): Promise<{ result: IVolumeDiscountResponse }> {
    const volume = request.netAnnualChargeVolume.doubleValue;

    let discountRate: number;

    if (volume < data.firstVolume) {
      discountRate = data.firstRate;
    } else if (volume < data.secondVolume) {
      discountRate = data.secondRate;
    } else {
      discountRate = data.thirdRate;
    }

    const response: IVolumeDiscountResponse = {
      $class: 'org.accordproject.volumediscount@0.2.0.VolumeDiscountResponse',
      $timestamp: new Date(),
      discountRate: discountRate,
    };

    return { result: response };
  }
}

export default VolumeDiscountLogic;
