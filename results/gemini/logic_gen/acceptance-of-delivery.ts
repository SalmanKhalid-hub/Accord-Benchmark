import { ITemplateModel, IInspectDeliverable, IInspectionResponse, InspectionStatus } from './generated/org.accordproject.acceptanceofdelivery@0.1.0';

// @ts-ignore
class AcceptanceOfDeliveryLogic extends TemplateLogic<ITemplateModel> {
    /**
     * The trigger method
     * @param data The clause data
     * @param request The incoming request
     */
    async trigger(data: ITemplateModel, request: IInspectDeliverable): Promise<{ result: IInspectionResponse }> {
        const deliverableReceivedAt = request.deliverableReceivedAt;
        const inspectionPassed = request.inspectionPassed;
        const businessDays = data.businessDays;

        // Calculate the inspection period end date (assuming deliverableReceivedAt is the start)
        // For simplicity, we're not implementing actual business day calculation here,
        // but rather a direct comparison based on the number of days.
        // In a real-world scenario, you'd need a robust business day calculation library.
        const inspectionPeriodEndDate = new Date(deliverableReceivedAt.getTime());
        inspectionPeriodEndDate.setDate(inspectionPeriodEndDate.getDate() + Number(businessDays));

        let status: InspectionStatus;

        if (new Date() > inspectionPeriodEndDate) {
            status = InspectionStatus.OUTSIDE_INSPECTION_PERIOD;
        } else if (inspectionPassed) {
            status = InspectionStatus.PASSED_TESTING;
        } else {
            status = InspectionStatus.FAILED_TESTING;
        }

        return {
            result: {
                $class: 'org.accordproject.acceptanceofdelivery@0.1.0.InspectionResponse',
                $timestamp: new Date(),
                status: status,
                shipper: data.shipper,
                receiver: data.receiver,
            },
        };
    }
}

export default AcceptanceOfDeliveryLogic;
