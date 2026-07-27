import { ITemplateModel, IAgreementState, IForecastRequest, IForecastResponse, IPurchaseRequest, IPurchaseResponse, IDeliveryRequest, IDeliveryResponse, IPaymentRequest, IPaymentResponse, IPurchaseOrder, IProduct, IOrderItem, IPurchaseObligationData, IDeliveryObligationData, IPaymentObligationData } from './generated/org.accordproject.supplyagreement@0.2.0';

class SupplyAgreementLogic extends TemplateLogic<ITemplateModel, IAgreementState> {
  async init(data: ITemplateModel): Promise<InitResponse<IAgreementState>> {
    return {
      state: {
        $class: 'org.accordproject.supplyagreement@0.2.0.AgreementState',
        $identifier: data.$identifier,
        status: 'INIT'
      }
    };
  }

  async trigger(data: ITemplateModel, request: any, state: IAgreementState): Promise<EngineResponse<any, IAgreementState>> {
    const currentStatus = state.status;
    switch (request.$class) {
      case 'org.accordproject.supplyagreement@0.2.0.ForecastRequest': {
        if (currentStatus !== 'INIT' && currentStatus !== 'FORECASTED' && currentStatus !== 'ORDERED' && currentStatus !== 'DELIVERED' && currentStatus !== 'PAID') {
          throw new Error(`Illegal transition from ${currentStatus} on ForecastRequest`);
        }
        const resp: IForecastResponse = {
          $class: 'org.accordproject.supplyagreement@0.2.0.ForecastResponse'
        };
        const purchaseObligation: IPurchaseObligationData = {
          $class: 'org.accordproject.supplyagreement@0.2.0.PurchaseObligationData',
          party: data.buyer,
          requiredPurchase: request.supplyForecast * 0.85,
          year: new Date().getUTCFullYear(),
          quarter: Math.floor(new Date().getUTCMonth() / 3) + 1
        };
        return {
          result: resp,
          state: { ...state, status: 'FORECASTED', purchaseObligation },
          events: []
        };
      }
      case 'org.accordproject.supplyagreement@0.2.0.PurchaseRequest': {
        if (currentStatus !== 'INIT' && currentStatus !== 'FORECASTED') {
          throw new Error(`Illegal transition from ${currentStatus} on PurchaseRequest`);
        }
        const po: IPurchaseOrder = request.purchaseOrder;
        const deliveryObligation: IDeliveryObligationData = {
          $class: 'org.accordproject.supplyagreement@0.2.0.DeliveryObligationData',
          party: data.supplier,
          expectedDelivery: po.deliveryDate,
          deliverables: po.products.map((p: IProduct) => ({
            $class: 'org.accordproject.supplyagreement@0.2.0.OrderItem',
            partNumber: p.partNumber,
            quantity: p.quantity
          }))
        };
        const event = {
          $class: 'org.accordproject.supplyagreement@0.2.0.DeliveryObligationEvent',
          party: data.supplier,
          expectedDelivery: po.deliveryDate,
          deliverables: po.products.map((p: IProduct) => ({
            $class: 'org.accordproject.supplyagreement@0.2.0.OrderItem',
            partNumber: p.partNumber,
            quantity: p.quantity
          }))
        };
        const resp: IPurchaseResponse = {
          $class: 'org.accordproject.supplyagreement@0.2.0.PurchaseResponse'
        };
        return {
          result: resp,
          state: { ...state, status: 'ORDERED', deliveryObligation },
          events: [event]
        };
      }
      case 'org.accordproject.supplyagreement@0.2.0.DeliveryRequest': {
        if (currentStatus !== 'ORDERED') {
          throw new Error(`Illegal transition from ${currentStatus} on DeliveryRequest`);
        }
        const resp: IDeliveryResponse = {
          $class: 'org.accordproject.supplyagreement@0.2.0.DeliveryResponse'
        };
        const event = {
          $class: 'org.accordproject.supplyagreement@0.2.0.PaymentObligationEvent',
          party: data.buyer,
          amount: {
            $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
            doubleValue: request.products.reduce((sum: number, p: IProduct) => sum + (p.unitPrice ? p.unitPrice.doubleValue * p.quantity : 0), 0),
            currencyCode: request.products.length > 0 ? request.products[0].unitPrice.currencyCode : 'USD'
          }
        };
        const paymentObligation: IPaymentObligationData = {
          $class: 'org.accordproject.supplyagreement@0.2.0.PaymentObligationData',
          party: data.buyer,
          amount: event.amount
        };
        return {
          result: resp,
          state: { ...state, status: 'DELIVERED', paymentObligation },
          events: [event]
        };
      }
      case 'org.accordproject.supplyagreement@0.2.0.PaymentRequest': {
        if (currentStatus !== 'DELIVERED') {
          throw new Error(`Illegal transition from ${currentStatus} on PaymentRequest`);
        }
        const resp: IPaymentResponse = {
          $class: 'org.accordproject.supplyagreement@0.2.0.PaymentResponse',
          paid: request.amount
        };
        return {
          result: resp,
          state: { ...state, status: 'PAID' },
          events: []
        };
      }
      default:
        throw new Error(`Unsupported request type ${request.$class}`);
    }
  }
}

export default SupplyAgreementLogic;
