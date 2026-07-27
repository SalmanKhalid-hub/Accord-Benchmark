// @ts-ignore
export default class FullPaymentUponSignatureLogic extends TemplateLogic<ITemplateModel, IFullPaymentUponSignatureState> {

    /**
     * Initialises the state of the clause
     * @param {ITemplateModel} data - the clause data
     * @return {Promise<InitResponse<IFullPaymentUponSignatureState>>} the clause state
     */
    async init(data: ITemplateModel): Promise<InitResponse<IFullPaymentUponSignatureState>> {
        return {
            state: {
                $class: 'org.accordproject.fullpaymentupondsignature.FullPaymentUponSignatureState',
                $identifier: data.$identifier,
                status: 'INITIALIZED'
            }
        };
    }

    /**
     * This is called when a trigger request is received
     * @param {ITemplateModel} data - the clause data
     * @param {Request} request - the incoming trigger request
     * @param {IFullPaymentUponSignatureState} state - the clause state
     * @returns {Promise<EngineResponse>} the response
     */
    async trigger(data: ITemplateModel, request: Request, state: IFullPaymentUponSignatureState): Promise<EngineResponse> {
        switch (request.$class) {
            case 'org.accordproject.fullpaymentupondsignature.ContractSigned': {
                if (state.status !== 'INITIALIZED') {
                    throw new Error('Contract already signed or payment already received.');
                }

                const newStatus = 'CONTRACT_SIGNED';
                const paymentObligationEvent: IPaymentObligationEvent = {
                    $class: 'org.accordproject.fullpaymentupondsignature.PaymentObligationEvent',
                    $timestamp: new Date(),
                    amount: data.amount,
                    description: `Payment of ${data.amount.doubleValue} ${data.amount.currencyCode} due from ${data.buyer} to ${data.seller}.`,
                    promisor: data.buyer,
                    promisee: data.seller
                };

                return {
                    result: {
                        $class: 'org.accordproject.fullpaymentupondsignature.ContractSignedResponse',
                    },
                    state: {
                        ...state,
                        status: newStatus
                    },
                    events: [paymentObligationEvent]
                };
            }
            case 'org.accordproject.fullpaymentupondsignature.PaymentReceived': {
                if (state.status !== 'CONTRACT_SIGNED') {
                    throw new Error('Payment cannot be received before the contract is signed.');
                }

                const newStatus = 'PAID';

                return {
                    result: {
                        $class: 'org.accordproject.fullpaymentupondsignature.PaymentReceivedResponse',
                    },
                    state: {
                        ...state,
                        status: newStatus
                    },
                    events: []
                };
            }
            default: {
                throw new Error(`Unknown request type: ${request.$class}`);
            }
        }
    }
}

import {
    ITemplateModel,
    IContractSigned,
    IContractSignedResponse,
    IPaymentReceived,
    IPaymentReceivedResponse,
    IPaymentObligationEvent,
    IFullPaymentUponSignatureState
} from './generated/org.accordproject.fullpaymentupondsignature@0.2.0';

import {
    Request,
    Response,
    State,
    Obligation
} from './generated/org.accordproject.runtime@0.2.0';

import {
    MonetaryAmount,
    CurrencyCode
} from './generated/org.accordproject.money@0.3.0';
