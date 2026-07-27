import { ITemplateModel, IInspectDeliverable, IInspectionResponse, InspectionStatus } from './generated/org.accordproject.acceptanceofdelivery@0.1.0';

class AcceptanceOfDeliveryLogic extends TemplateLogic<ITemplateModel> {
  // @ts-ignore
  public async trigger(data: ITemplateModel, request: IInspectDeliverable): Promise<{ result: IInspectionResponse }> {
    const receivedAt = new Date(request.deliverableReceivedAt as any);
    const now = new Date();
    const businessDays = data.businessDays || 10;

    const inspectionDeadline = this.addBusinessDays(receivedAt, businessDays);

    const passed = !!request.inspectionPassed;
    const status =
      now.getTime() <= inspectionDeadline.getTime()
        ? (passed ? InspectionStatus.PASSED_TESTING : InspectionStatus.FAILED_TESTING)
        : InspectionStatus.OUTSIDE_INSPECTION_PERIOD;

    return {
      result: {
        $class: 'org.accordproject.acceptanceofdelivery@0.1.0.InspectionResponse',
        $timestamp: new Date(),
        status,
        shipper: data.shipper,
        receiver: data.receiver
      }
    };
  }

  private addBusinessDays(startDate: Date, businessDays: number): Date {
    const result = new Date(startDate.getTime());
    let daysAdded = 0;

    while (daysAdded < businessDays) {
      result.setDate(result.getDate() + 1);
      const day = result.getDay();
      if (day !== 0 && day !== 6) {
        daysAdded++;
      }
    }

    return result;
  }
}

export default AcceptanceOfDeliveryLogic;
