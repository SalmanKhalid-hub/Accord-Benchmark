import {
  ITemplateModel,
  ISupplyAgreementState,
  ISensorReading,
  ICheckContract,
  IDeliveryResponse,
  ISensorReadingData,
} from './generated/org.accordproject.supplyagreementloc@0.2.0';

// @ts-ignore
class SupplyAgreementLogic extends TemplateLogic<ITemplateModel, ISupplyAgreementState> {
  async init(data: ITemplateModel): Promise<InitResponse<ISupplyAgreementState>> {
    return {
      state: {
        $class: 'org.accordproject.supplyagreementloc@0.2.0.SupplyAgreementState',
        $identifier: data.$identifier,
        status: 'INITIATED',
        sensorReadings: [],
      },
    };
  }

  async trigger(
    data: ITemplateModel,
    request: ISensorReading | ICheckContract,
    state: ISupplyAgreementState
  ): Promise<EngineResponse<ISupplyAgreementState>> {
    if (request.$class === 'org.accordproject.supplyagreementloc@0.2.0.SensorReading') {
      const sensorRequest = request as ISensorReading;

      if (state.status !== 'INITIATED' && state.status !== 'IN_TRANSIT') {
        throw new Error(
          `Cannot record sensor reading in state ${state.status}. Expected INITIATED or IN_TRANSIT.`
        );
      }

      const newReading: ISensorReadingData = {
        temperature: sensorRequest.temperature,
        humidity: sensorRequest.humidity,
        readingTime: new Date(),
      };

      const updatedReadings = [...(state.sensorReadings || []), newReading];
      const newStatus = state.status === 'INITIATED' ? 'IN_TRANSIT' : 'IN_TRANSIT';

      return {
        result: {
          $class: 'org.accordproject.runtime@0.2.0.Response',
          message: `Sensor reading recorded: ${sensorRequest.temperature}°C, ${sensorRequest.humidity}% humidity`,
        },
        state: {
          ...state,
          status: newStatus,
          sensorReadings: updatedReadings,
        },
        events: [
          {
            $class: 'org.accordproject.supplyagreementloc@0.2.0.SensorReadingRecorded',
            temperature: sensorRequest.temperature,
            humidity: sensorRequest.humidity,
            timestamp: new Date(),
          },
        ],
      };
    } else if (request.$class === 'org.accordproject.supplyagreementloc@0.2.0.CheckContract') {
      if (state.status === 'INITIATED') {
        throw new Error('Contract check cannot be performed in INITIATED state.');
      }

      const acceptanceCriteriaMet = this.validateAcceptanceCriteria(state.sensorReadings || []);

      const newStatus = acceptanceCriteriaMet ? 'ACCEPTED' : 'REJECTED';

      const result: IDeliveryResponse = {
        $class: 'org.accordproject.supplyagreementloc@0.2.0.DeliveryResponse',
        message: acceptanceCriteriaMet
          ? 'Delivery accepted. All acceptance criteria met.'
          : 'Delivery rejected. Acceptance criteria not met.',
        inGoodOrder: acceptanceCriteriaMet,
      };

      return {
        result,
        state: {
          ...state,
          status: newStatus,
        },
        events: [
          {
            $class: 'org.accordproject.supplyagreementloc@0.2.0.DeliveryChecked',
            inGoodOrder: acceptanceCriteriaMet,
            timestamp: new Date(),
          },
        ],
      };
    }

    throw new Error(`Unknown request type: ${request.$class}`);
  }

  private validateAcceptanceCriteria(readings: ISensorReadingData[]): boolean {
    if (!readings || readings.length === 0) {
      return false;
    }

    for (const reading of readings) {
      if (reading.temperature < 0 || reading.temperature > 25) {
        return false;
      }
      if (reading.humidity < 30 || reading.humidity > 70) {
        return false;
      }
    }

    return true;
  }
}

export default SupplyAgreementLogic;
