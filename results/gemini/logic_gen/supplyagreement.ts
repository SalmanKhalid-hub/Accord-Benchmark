// @ts-ignore
default export class SupplyAgreementLogic extends TemplateLogic<ITemplateModel, IAgreementState> {

    /**
     * Initialises the state of the clause.
     * @param {ITemplateModel} data - the clause data
     * @returns {Promise<InitResponse<IAgreementState>>} the initial state
     */
    async init(data: ITemplateModel): Promise<InitResponse<IAgreementState>> {
        return {
            state: {
                $class: 'org.accordproject.supplyagreement.AgreementState',
                $identifier: data.$identifier,
            }
        };
    }

    /**
     * Handles the incoming requests and transitions the state.
     * @param {ITemplateModel} data - the clause data
     * @param {Request} request - the incoming request
     * @param {IAgreementState} state - the current state
     * @returns {Promise<EngineResponse<IAgreementState>>} the response and new state
     */
    async trigger(data: ITemplateModel, request: Request, state: IAgreementState): Promise<EngineResponse<IAgreementState>> {
        switch (request.$class) {
            case 'org.accordproject.supplyagreement.ForecastRequest': {
                const forecastRequest = request as IForecastRequest;

                // Create a new state object to avoid modifying the original directly
                const newState = { ...state };
                const events: Obligation[] = [];

                // Calculate the required purchase based on the minimum percentage
                const requiredPurchase = forecastRequest.supplyForecast * (data.minimumPercentage / 100);

                // Determine the current year and quarter for the obligation
                const now = new Date();
                const year = now.getFullYear();
                const quarter = Math.floor(now.getMonth() / 3) + 1;

                // Create the PurchaseObligationData
                const purchaseObligationData: IPurchaseObligationData = {
                    $class: 'org.accordproject.supplyagreement.PurchaseObligationData',
                    party: data.buyer, // The buyer has the obligation to purchase
                    requiredPurchase: requiredPurchase,
                    year: year,
                    quarter: quarter,
                };

                // Update the state with the new purchase obligation
                newState.purchaseObligation = purchaseObligationData;

                // Emit a PurchaseObligationEvent
                const purchaseObligationEvent: IPurchaseObligationEvent = {
                    $class: 'org.accordproject.supplyagreement.PurchaseObligationEvent',
                    party: data.buyer,
                    requiredPurchase: requiredPurchase,
                    year: year,
                    quarter: quarter,
                    $timestamp: new Date(),
                };
                events.push(purchaseObligationEvent);

                return {
                    result: {
                        $class: 'org.accordproject.supplyagreement.ForecastResponse',
                    },
                    state: newState,
                    events: events,
                };
            }

            case 'org.accordproject.supplyagreement.PurchaseRequest': {
                const purchaseRequest = request as IPurchaseRequest;
                const newState = { ...state };
                const events: Obligation[] = [];

                // Calculate the total amount for the purchase order
                let totalAmount = 0;
                const deliverables: IOrderItem[] = [];

                for (const product of purchaseRequest.purchaseOrder.products) {
                    totalAmount += product.quantity * product.unitPrice.doubleValue;
                    deliverables.push({
                        $class: 'org.accordproject.supplyagreement.OrderItem',
                        partNumber: product.partNumber,
                        quantity: product.quantity,
                    });
                }

                // Create the DeliveryObligationData
                const deliveryObligationData: IDeliveryObligationData = {
                    $class: 'org.accordproject.supplyagreement.DeliveryObligationData',
                    party: data.supplier, // The supplier has the obligation to deliver
                    expectedDelivery: purchaseRequest.purchaseOrder.deliveryDate,
                    deliverables: deliverables,
                };
                newState.deliveryObligation = deliveryObligationData;

                // Create the PaymentObligationData
                const paymentObligationData: IPaymentObligationData = {
                    $class: 'org.accordproject.supplyagreement.PaymentObligationData',
                    party: data.buyer, // The buyer has the obligation to pay
                    amount: {
                        $class: 'org.accordproject.money.MonetaryAmount',
                        doubleValue: totalAmount,
                        currencyCode: purchaseRequest.purchaseOrder.products[0].unitPrice.currencyCode, // Assuming all products have the same currency
                    },
                };
                newState.paymentObligation = paymentObligationData;

                // Emit a DeliveryObligationEvent
                const deliveryObligationEvent: IDeliveryObligationEvent = {
                    $class: 'org.accordproject.supplyagreement.DeliveryObligationEvent',
                    party: data.supplier,
                    expectedDelivery: purchaseRequest.purchaseOrder.deliveryDate,
                    deliverables: deliverables,
                    $timestamp: new Date(),
                };
                events.push(deliveryObligationEvent);

                return {
                    result: {
                        $class: 'org.accordproject.supplyagreement.PurchaseResponse',
                    },
                    state: newState,
                    events: events,
                };
            }

            case 'org.accordproject.supplyagreement.DeliveryRequest': {
                const deliveryRequest = request as IDeliveryRequest;
                const newState = { ...state };
                const events: Obligation[] = [];

                if (!state.deliveryObligation) {
                    throw new Error('No active delivery obligation to fulfill.');
                }

                // Check if the delivered products match the expected deliverables
                const expectedDeliverables = state.deliveryObligation.deliverables;
                let deliveryFulfilled = true;
                if (expectedDeliverables.length !== deliveryRequest.products.length) {
                    deliveryFulfilled = false;
                } else {
                    for (const expectedItem of expectedDeliverables) {
                        const deliveredProduct = deliveryRequest.products.find(p => p.partNumber === expectedItem.partNumber);
                        if (!deliveredProduct || deliveredProduct.quantity !== expectedItem.quantity) {
                            deliveryFulfilled = false;
                            break;
                        }
                    }
                }

                if (!deliveryFulfilled) {
                    throw new Error('Delivered products do not match the delivery obligation.');
                }

                // Clear the delivery obligation as it's fulfilled
                newState.deliveryObligation = undefined;

                // No specific event for successful delivery in the model, but we can emit a generic one or none.
                // For now, we'll just update the state.

                return {
                    result: {
                        $class: 'org.accordproject.supplyagreement.DeliveryResponse',
                    },
                    state: newState,
                    events: events,
                };
            }

            case 'org.accordproject.supplyagreement.PaymentRequest': {
                const paymentRequest = request as IPaymentRequest;
                const newState = { ...state };
                const events: Obligation[] = [];

                if (!state.paymentObligation) {
                    throw new Error('No active payment obligation to fulfill.');
                }

                // Check if the payment amount matches the obligation
                if (paymentRequest.amount.doubleValue < state.paymentObligation.amount.doubleValue) {
                    throw new Error('Payment amount is less than the required amount.');
                }
                if (paymentRequest.amount.currencyCode !== state.paymentObligation.amount.currencyCode) {
                    throw new Error('Payment currency does not match the required currency.');
                }

                // Clear the payment obligation as it's fulfilled
                newState.paymentObligation = undefined;

                // Emit a PaymentObligationEvent (as a confirmation of payment)
                const paymentObligationEvent: IPaymentObligationEvent = {
                    $class: 'org.accordproject.supplyagreement.PaymentObligationEvent',
                    party: data.buyer, // The buyer made the payment
                    amount: paymentRequest.amount,
                    $timestamp: new Date(),
                };
                events.push(paymentObligationEvent);

                return {
                    result: {
                        $class: 'org.accordproject.supplyagreement.PaymentResponse',
                        paid: paymentRequest.amount,
                    },
                    state: newState,
                    events: events,
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
    IForecastRequest,
    IForecastResponse,
    IPurchaseRequest,
    IPurchaseResponse,
    IDeliveryRequest,
    IDeliveryResponse,
    IPaymentRequest,
    IPaymentResponse,
    IAgreementState,
    IPurchaseObligationData,
    IDeliveryObligationData,
    IPaymentObligationData,
    IDeliveryObligationEvent,
    IPurchaseObligationEvent,
    IPaymentObligationEvent,
    IOrderItem,
} from './generated/org.accordproject.supplyagreement@0.2.0';

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
