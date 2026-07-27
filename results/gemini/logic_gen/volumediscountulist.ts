// @ts-ignore
class VolumeDiscountLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: IVolumeDiscountRequest
  ): Promise<{ result: IVolumeDiscountResponse }> {
    const netAnnualChargeVolume = request.netAnnualChargeVolume.doubleValue;
    let discountRate = 0.0;

    for (const rateRange of data.rates) {
      if (
        netAnnualChargeVolume >= rateRange.volumeAbove &&
        netAnnualChargeVolume < rateRange.volumeUpTo
      ) {
        discountRate = rateRange.rate;
        break;
      }
    }

    return {
      result: {
        $class:
          'org.accordproject.volumediscountulist@0.2.0.VolumeDiscountResponse',
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
} from './generated/org.accordproject.volumediscountulist@0.2.0';

export default VolumeDiscountLogic;
