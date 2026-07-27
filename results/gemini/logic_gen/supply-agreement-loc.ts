// @ts-ignore
export default class SupplyAgreementLOCLogic extends TemplateLogic<ITemplateModel, ISupplyAgreementState> {
  /**
   * Initialise the state of the clause
   * @param data The clause data
   */
  async init(data: ITemplateModel): Promise<InitResponse<ISupplyAgreementState>> {
    return {
      state: {
        $class: 'org.accordproject.supplyagreementloc.SupplyAgreementState',
        $identifier: data.$identifier,
        sensorReadings: [],
        status: 'INITIALIZED',
      },
    };
  }

  /**
   * Handle a trigger request
   * @param data The clause data
   * @param request The request
   * @param state The clause state
   */
  async trigger(
    data: ITemplateModel,
    request: Request,
    state: ISupplyAgreementState
  ): Promise<EngineResponse<Response, ISupplyAgreementState>> {
    switch (request.$class) {
      case 'org.accordproject.supplyagreementloc.SensorReading': {
        const sensorReadingRequest = request as ISensorReading;

        if (state.status !== 'INITIALIZED' && state.status !== 'IN_TRANSIT') {
          throw new Error(`Invalid state for SensorReading: ${state.status}`);
        }

        const newSensorReading: ISensorReadingData = {
          $class: 'org.accordproject.supplyagreementloc.SensorReadingData',
          temperature: sensorReadingRequest.temperature,
          humidity: sensorReadingRequest.humidity,
          readingTime: new Date(),
        };

        state.sensorReadings.push(newSensorReading);

        // Check for sensor reading frequency
        const now = new Date();
        const readingsInDuration = state.sensorReadings.filter(
          (sr) =>
            now.getTime() - sr.readingTime.getTime() <=
            this.getDurationInMilliseconds(data.duration, data.countPeriod)
        );

        if (readingsInDuration.length < data.sensorReadingFrequency) {
          console.log(
            `Warning: Sensor readings frequency not met. Expected ${data.sensorReadingFrequency}, got ${readingsInDuration.length}`
          );
        }

        return {
          state,
          events: [],
          result: {
            $class: 'org.accordproject.runtime.Response',
            $timestamp: new Date(),
          },
        };
      }

      case 'org.accordproject.supplyagreementloc.CheckContract': {
        const checkContractRequest = request as ICheckContract;

        // This trigger can be used to check various conditions,
        // but for this example, we'll just acknowledge it.
        // In a real scenario, this might trigger checks for payment, delivery, etc.

        return {
          state,
          events: [],
          result: {
            $class: 'org.accordproject.runtime.Response',
            $timestamp: new Date(),
          },
        };
      }

      default: {
        throw new Error(`Unknown request type: ${request.$class}`);
      }
    }
  }

  private getDurationInMilliseconds(
    duration: TemporalUnit,
    countPeriod: string
  ): number {
    let multiplier = 1;
    switch (duration) {
      case 'DAYS':
        multiplier = 24 * 60 * 60 * 1000;
        break;
      case 'HOURS':
        multiplier = 60 * 60 * 1000;
        break;
      case 'MINUTES':
        multiplier = 60 * 1000;
        break;
      case 'SECONDS':
        multiplier = 1000;
        break;
      default:
        throw new Error(`Unsupported TemporalUnit: ${duration}`);
    }

    // Assuming countPeriod is an integer string
    return parseInt(countPeriod, 10) * multiplier;
  }
}
