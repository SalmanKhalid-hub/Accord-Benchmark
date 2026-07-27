import { ITemplateModel, IVolumeDiscountRequest, IVolumeDiscountResponse } from './generated/org.accordproject.volumediscountolist@0.2.0';


// @ts-ignore
class VolumeDiscountOlistLogic extends TemplateLogic<ITemplateModel> {
  public async trigger(data: ITemplateModel, request: IVolumeDiscountRequest): Promise<{ result: IVolumeDiscountResponse }> {
    const volume = request.netAnnualChargeVolume.doubleValue;

    let discountRate = 0;

    for (const rateRange of data.rates) {
      if (volume >= rateRange.volumeAbove && volume < rateRange.volumeUpTo) {
        discountRate = rateRange.rate;
        break;
      }
    }

    return {
      result: {
        $class: 'org.accordproject.volumediscountolist@0.2.0.VolumeDiscountResponse',
        $timestamp: new Date(),
        discountRate
      }
    };
  }
}

export default VolumeDiscountOlistLogic;
