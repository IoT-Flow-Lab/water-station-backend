import { Controller, Get, Query, Logger } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, MqttContext } from '@nestjs/microservices';
import { TelemetryService } from './telemetry.service';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';
import { TelemetryEntity } from './telemetry.entity';
import {
  TelemetryPaginationQueryDto,
  TelemetryRangeQueryDto,
  TelemetryLatestQueryDto,
} from './dto/query-telemetry.dto';

@Controller('telemetry')
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  constructor(private readonly telemetryService: TelemetryService) {}

  /**
   * MQTT Message Pattern matching wildcard: weather_station/+/+/telemetry
   * Matches any domain and station identifier (e.g. weather_station/sci.pdn.ac.lk/e97d1b32/telemetry).
   */
  @MessagePattern('weather_station/+/+/telemetry')
  async handleTelemetry(
    @Payload() payload: CreateTelemetryDto,
    @Ctx() context: MqttContext,
  ): Promise<void> {
    const topic = context.getTopic();
    this.logger.log(`MQTT message received on topic: ${topic}`);

    try {
      // Pass the extracted topic and validation-checked payload to the service
      await this.telemetryService.saveTelemetry(topic, payload);
    } catch (error) {
      this.logger.error(`Error processing telemetry on topic "${topic}":`, error.stack);
    }
  }

  /**
   * HTTP GET Endpoint to retrieve paginated telemetry data from TimescaleDB (for lazy loading).
   */
  @Get()
  async getStoredTelemetry(
    @Query() query: TelemetryPaginationQueryDto,
  ) {
    this.logger.log(`HTTP request received to retrieve paginated telemetry (Page: ${query.page}, Limit: ${query.limit})`);
    return this.telemetryService.getPaginatedTelemetry(query);
  }

  /**
   * HTTP GET Endpoint to retrieve the latest telemetry record.
   */
  @Get('latest')
  async getLatestTelemetry(
    @Query() query: TelemetryLatestQueryDto,
  ): Promise<TelemetryEntity | null> {
    this.logger.log(`HTTP request received to retrieve latest telemetry record`);
    return this.telemetryService.getLatestTelemetry(query);
  }

  /**
   * HTTP GET Endpoint to retrieve telemetry records within a date-time range.
   */
  @Get('range')
  async getTelemetryByRange(
    @Query() query: TelemetryRangeQueryDto,
  ) {
    this.logger.log(`HTTP request received to retrieve telemetry range from ${query.start} to ${query.end}`);
    return this.telemetryService.getTelemetryByRange(query);
  }

  /**
   * HTTP GET Endpoint to retrieve active stations and sensor information.
   */
  @Get('sensors')
  async getSensorsInfo() {
    this.logger.log('HTTP request received to retrieve active stations and sensor summary info');
    return this.telemetryService.getSensorsInfo();
  }
}
