import { ITemplateModel, IVolumeDiscountRequest, IVolumeDiscountResponse } from './generated/org.accordproject.volumediscountolist@0.2.0';

// @ts-ignore
class VolumeDiscountLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IVolumeDiscountRequest): Promise<{ result: IVolumeDiscountResponse }> {
    const volume = request.netAnnualChargeVolume.doubleValue;
    
    let discountRate = 0;
    
    for (const rate of data.rates) {
      const meetsLowerBound = rate.volumeAbove === undefined || volume >= rate.volumeAbove;
      const meetsUpperBound = rate.volumeUpTo === undefined || volume < rate.volumeUpTo;
      
      if (meetsLowerBound && meetsUpperBound) {
        discountRate = rate.rate;
        break;
      }
    }
    
    const response: IVolumeDiscountResponse = {
      $class: 'org.accordproject.volumediscountolist@0.2.0.VolumeDiscountResponse',
      $timestamp: new Date(),
      discountRate: discountRate
    };
    
    return { result: response };
  }
}

export default VolumeDiscountLogic;
