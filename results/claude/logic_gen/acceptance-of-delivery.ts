import {
  ITemplateModel,
  IInspectDeliverable,
  IInspectionResponse,
  InspectionStatus,
} from './generated/org.accordproject.acceptanceofdelivery@0.1.0';

// @ts-ignore
class AcceptanceOfDeliveryLogic extends TemplateLogic<ITemplateModel> {
  async trigger(
    data: ITemplateModel,
    request: IInspectDeliverable
  ): Promise<{ result: IInspectionResponse }> {
    const now = new Date();
    const deliveryDate = new Date(request.deliverableReceivedAt);
    const inspectionDeadline = new Date(deliveryDate);
    inspectionDeadline.setDate(
      inspectionDeadline.getDate() + Number(data.businessDays)
    );

    let status: InspectionStatus;

    if (now > inspectionDeadline) {
      status = InspectionStatus.OUTSIDE_INSPECTION_PERIOD;
    } else if (request.inspectionPassed) {
      status = InspectionStatus.PASSED_TESTING;
    } else {
      status = InspectionStatus.FAILED_TESTING;
    }

    const response: IInspectionResponse = {
      $class:
        'org.accordproject.acceptanceofdelivery@0.1.0.InspectionResponse',
      $timestamp: new Date(),
      status: status,
      shipper: data.shipper,
      receiver: data.receiver,
    };

    return { result: response };
  }
}

export default AcceptanceOfDeliveryLogic;
