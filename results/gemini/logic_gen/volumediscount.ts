// @ts-ignore
export default class VolumeDiscountLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: IVolumeDiscountRequest
  ): Promise<{ result: IVolumeDiscountResponse }> {
    const netAnnualChargeVolume = request.netAnnualChargeVolume.doubleValue;
    let discountRate: number;

    if (netAnnualChargeVolume < data.firstVolume) {
      discountRate = data.firstRate;
    } else if (
      netAnnualChargeVolume >= data.firstVolume &&
      netAnnualChargeVolume <= data.secondVolume
    ) {
      discountRate = data.secondRate;
    } else {
      discountRate = data.thirdRate;
    }

    return {
      result: {
        $class: 'org.accordproject.volumediscount@0.2.0.VolumeDiscountResponse',
        $timestamp: new Date(),
        discountRate: discountRate,
      },
    };
  }
}

import {
  ITemplateModel,
  IVolumeDiscountRequest,
  IVolumeDiscountResponse,
} from './generated/org.accordproject.volumediscount@0.2.0';
