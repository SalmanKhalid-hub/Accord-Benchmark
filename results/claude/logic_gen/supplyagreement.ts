import {
  ITemplateModel,
  IAgreementState,
  IForecastRequest,
  IForecastResponse,
  IPurchaseRequest,
  IPurchaseResponse,
  IDeliveryRequest,
  IDeliveryResponse,
  IPaymentRequest,
  IPaymentResponse,
  IProduct,
  IOrderItem,
  IPurchaseOrder,
  IDeliveryObligationEvent,
  IPurchaseObligationEvent,
  IPaymentObligationEvent,
  IPurchaseObligationData,
  IDeliveryObligationData,
  IPaymentObligationData,
} from './generated/org.accordproject.supplyagreement@0.2.0';

// @ts-ignore
class SupplyAgreementLogic extends TemplateLogic<ITemplateModel, IAgreementState> {
  async init(data: ITemplateModel): Promise<InitResponse<IAgreementState>> {
    return {
      state: {
        $class: 'org.accordproject.supplyagreement@0.2.0.AgreementState',
        $identifier: data.$identifier,
        status: 'ACTIVE',
        purchaseObligation: undefined,
        deliveryObligation: undefined,
        paymentObligation: undefined,
      },
    };
  }

  async trigger(
    data: ITemplateModel,
    request: any,
    state: IAgreementState
  ): Promise<EngineResponse<IAgreementState>> {
    if (request.$class === 'org.accordproject.supplyagreement@0.2.0.ForecastRequest') {
      return this.handleForecastRequest(data, request as IForecastRequest, state);
    } else if (request.$class === 'org.accordproject.supplyagreement@0.2.0.PurchaseRequest') {
      return this.handlePurchaseRequest(data, request as IPurchaseRequest, state);
    } else if (request.$class === 'org.accordproject.supplyagreement@0.2.0.DeliveryRequest') {
      return this.handleDeliveryRequest(data, request as IDeliveryRequest, state);
    } else if (request.$class === 'org.accordproject.supplyagreement@0.2.0.PaymentRequest') {
      return this.handlePaymentRequest(data, request as IPaymentRequest, state);
    } else {
      throw new Error(`Unknown request type: ${request.$class}`);
    }
  }

  private async handleForecastRequest(
    data: ITemplateModel,
    request: IForecastRequest,
    state: IAgreementState
  ): Promise<EngineResponse<IAgreementState>> {
    if (state.status !== 'ACTIVE') {
      throw new Error(`Cannot process forecast in state: ${state.status}`);
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

    const purchaseObligation: IPurchaseObligationData = {
      party: data.buyer,
      requiredPurchase: request.supplyForecast * (data.minimumPercentage / 100),
      year: currentYear,
      quarter: currentQuarter,
    };

    const event: IPurchaseObligationEvent = {
      $class: 'org.accordproject.supplyagreement@0.2.0.PurchaseObligationEvent',
      $timestamp: new Date(),
      party: data.buyer,
      requiredPurchase: purchaseObligation.requiredPurchase,
      year: currentYear,
      quarter: currentQuarter,
    };

    const newState: IAgreementState = {
      ...state,
      status: 'ACTIVE',
      purchaseObligation,
    };

    return {
      result: {
        $class: 'org.accordproject.supplyagreement@0.2.0.ForecastResponse',
        $timestamp: new Date(),
      },
      state: newState,
      events: [event],
    };
  }

  private async handlePurchaseRequest(
    data: ITemplateModel,
    request: IPurchaseRequest,
    state: IAgreementState
  ): Promise<EngineResponse<IAgreementState>> {
    if (state.status !== 'ACTIVE') {
      throw new Error(`Cannot process purchase order in state: ${state.status}`);
    }

    const orderItems: IOrderItem[] = request.purchaseOrder.products.map((product: IProduct) => ({
      partNumber: product.partNumber,
      quantity: product.quantity,
    }));

    const deliveryObligation: IDeliveryObligationData = {
      party: data.supplier,
      expectedDelivery: request.purchaseOrder.deliveryDate,
      deliverables: orderItems,
    };

    const deliveryEvent: IDeliveryObligationEvent = {
      $class: 'org.accordproject.supplyagreement@0.2.0.DeliveryObligationEvent',
      $timestamp: new Date(),
      party: data.supplier,
      expectedDelivery: request.purchaseOrder.deliveryDate,
      deliverables: orderItems,
    };

    let totalAmount = 0;
    for (const product of request.purchaseOrder.products) {
      totalAmount += product.quantity * product.unitPrice.doubleValue;
    }

    const paymentObligation: IPaymentObligationData = {
      party: data.buyer,
      amount: {
        $class: 'org.accordproject.money@0.3.0.MonetaryAmount',
        doubleValue: totalAmount,
        currencyCode: request.purchaseOrder.products[0].unitPrice.currencyCode,
      },
    };

    const paymentEvent: IPaymentObligationEvent = {
      $class: 'org.accordproject.supplyagreement@0.2.0.PaymentObligationEvent',
      $timestamp: new Date(),
      party: data.buyer,
      amount: paymentObligation.amount,
    };

    const newState: IAgreementState = {
      ...state,
      status: 'ACTIVE',
      deliveryObligation,
      paymentObligation,
    };

    return {
      result: {
        $class: 'org.accordproject.supplyagreement@0.2.0.PurchaseResponse',
        $timestamp: new Date(),
      },
      state: newState,
      events: [deliveryEvent, paymentEvent],
    };
  }

  private async handleDeliveryRequest(
    data: ITemplateModel,
    request: IDeliveryRequest,
    state: IAgreementState
  ): Promise<EngineResponse<IAgreementState>> {
    if (state.status !== 'ACTIVE') {
      throw new Error(`Cannot process delivery in state: ${state.status}`);
    }

    const newState: IAgreementState = {
      ...state,
      status: 'ACTIVE',
      deliveryObligation: undefined,
    };

    return {
      result: {
        $class: 'org.accordproject.supplyagreement@0.2.0.DeliveryResponse',
        $timestamp: new Date(),
      },
      state: newState,
      events: [],
    };
  }

  private async handlePaymentRequest(
    data: ITemplateModel,
    request: IPaymentRequest,
    state: IAgreementState
  ): Promise<EngineResponse<IAgreementState>> {
    if (state.status !== 'ACTIVE') {
      throw new Error(`Cannot process payment in state: ${state.status}`);
    }

    if (!state.paymentObligation) {
      throw new Error('No payment obligation found');
    }

    if (
      request.amount.doubleValue !== state.paymentObligation.amount.doubleValue ||
      request.amount.currencyCode !== state.paymentObligation.amount.currencyCode
    ) {
      throw new Error('Payment amount does not match obligation');
    }

    const newState: IAgreementState = {
      ...state,
      status: 'ACTIVE',
      paymentObligation: undefined,
    };

    return {
      result: {
        $class: 'org.accordproject.supplyagreement@0.2.0.PaymentResponse',
        $timestamp: new Date(),
        paid: request.amount,
      },
      state: newState,
      events: [],
    };
  }
}

export default SupplyAgreementLogic;
