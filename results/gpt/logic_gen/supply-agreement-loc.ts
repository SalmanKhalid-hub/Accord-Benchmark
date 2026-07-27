import { ITemplateModel, ISensorReading, ICheckContract, IDeliveryResponse, ISupplyAgreementState } from './generated/org.accordproject.supplyagreementloc@0.2.0';

class SupplyAgreementWithTradeFinanceLogic {
  async init(data: ITemplateModel): Promise<InitResponse<ISupplyAgreementState>> {
    return {
      state: {
        $class: 'org.accordproject.supplyagreementloc@0.2.0.SupplyAgreementState',
        $identifier: data.$identifier,
        sensorReadings: [],
        status: 'NEW'
      }
    } as InitResponse<ISupplyAgreementState>;
  }

  async trigger(data: ITemplateModel, request: any, state: ISupplyAgreementState): Promise<EngineResponse<any, ISupplyAgreementState>> {
    switch (request.$class) {
      case 'org.accordproject.supplyagreementloc@0.2.0.SensorReading': {
        if (state.status !== 'NEW' && state.status !== 'ACTIVE') {
          throw new Error(`Illegal transition from ${state.status} on SensorReading`);
        }
        const reading = {
          $class: 'org.accordproject.supplyagreementloc@0.2.0.SensorReadingData',
          temperature: request.temperature,
          humidity: request.humidity,
          readingTime: new Date()
        };
        return {
          result: undefined,
          state: {
            ...state,
            status: 'ACTIVE',
            sensorReadings: [...(state.sensorReadings || []), reading]
          },
          events: []
        };
      }

      case 'org.accordproject.supplyagreementloc@0.2.0.CheckContract': {
        if (state.status !== 'ACTIVE' && state.status !== 'NEW') {
          throw new Error(`Illegal transition from ${state.status} on CheckContract`);
        }
        return {
          result: {
            $class: 'org.accordproject.supplyagreementloc@0.2.0.DeliveryResponse',
            message: 'Contract is in force',
            inGoodOrder: true
          },
          state: {
            ...state,
            status: 'ACTIVE'
          },
          events: []
        };
      }

      default:
        throw new Error(`Unsupported request type: ${request.$class}`);
    }
  }
}

// @ts-ignore
export default SupplyAgreementWithTradeFinanceLogic;
