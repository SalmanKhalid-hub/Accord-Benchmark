import { ITemplateModel, IVolumeDiscountRequest, IVolumeDiscountResponse } from './generated/org.accordproject.volumediscountulist@0.2.0';

export class VolumeDiscountLogic extends TemplateLogic<ITemplateModel> {
  // @ts-ignore
  async trigger(data: ITemplateModel, request: IVolumeDiscountRequest): Promise<{ result: IVolumeDiscountResponse }> {
    const volume = request.netAnnualChargeVolume.doubleValue;
    const currencyCode = request.netAnnualChargeVolume.currencyCode;

    let discountRate = 0;

    for (const rateRange of data.rates || []) {
      const aboveOk = volume >= rateRange.volumeAbove;
      const upToOk = volume < rateRange.volumeUpTo;
      if (aboveOk && upToOk) {
        discountRate = rateRange.rate;
        break;
      }
    }

    return {
      result: {
        $class: 'org.accordproject.volumediscountulist@0.2.0.VolumeDiscountResponse',
        $timestamp: new Date(),
        discountRate
      }
    };
  }
}

export default VolumeDiscountLogic;
