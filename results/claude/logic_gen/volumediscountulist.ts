import { ITemplateModel, IVolumeDiscountRequest, IVolumeDiscountResponse } from './generated/org.accordproject.volumediscountulist@0.2.0';

// @ts-ignore
class VolumeDiscountLogic extends TemplateLogic<ITemplateModel> {
  async trigger(data: ITemplateModel, request: IVolumeDiscountRequest): Promise<{ result: IVolumeDiscountResponse }> {
    const volume = request.netAnnualChargeVolume.doubleValue;
    
    let discountRate = 0;
    
    for (const range of data.rates) {
      const meetsLowerBound = range.volumeAbove === undefined || volume >= range.volumeAbove;
      const meetsUpperBound = range.volumeUpTo === undefined || volume < range.volumeUpTo;
      
      if (meetsLowerBound && meetsUpperBound) {
        discountRate = range.rate;
        break;
      }
    }
    
    const response: IVolumeDiscountResponse = {
      $class: 'org.accordproject.volumediscountulist@0.2.0.VolumeDiscountResponse',
      $timestamp: new Date(),
      discountRate: discountRate
    };
    
    return { result: response };
  }
}

export default VolumeDiscountLogic;
