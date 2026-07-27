// @ts-ignore
class OnlinePaymentContractTrLogic extends TemplateLogic<ITemplateModel> {
    async trigger(data: ITemplateModel, request: IMyRequest): Promise<{ result: IMyResponse }> {
        const response: IMyResponse = {
            $class: 'org.accordproject.onlinepaymentcontracttr@0.1.0.MyResponse',
            $timestamp: new Date(),
            output: `Hello ${data.buyer} and ${data.seller}! You are using ${data.softwareID} for ${data.userCount} users. The authorized court is ${data.authorizedCourt}. Your request input was: ${request.input}`
        };
        return { result: response };
    }
}

declare class TemplateLogic<T> {
    /**
     * The contract data.
     */
    data: T;
}

import {
    ITemplateModel,
    IMyRequest,
    IMyResponse
} from './generated/org.accordproject.onlinepaymentcontracttr@0.1.0';

export default OnlinePaymentContractTrLogic;
