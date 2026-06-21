import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { TelemetryEntity } from './telemetry.entity';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';
import {
  TelemetryPaginationQueryDto,
  TelemetryRangeQueryDto,
  TelemetryLatestQueryDto,
} from './dto/query-telemetry.dto';

@Injectable()
export class TelemetryService implements OnModuleInit {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(
    @InjectRepository(TelemetryEntity)
    private readonly telemetryRepository: Repository<TelemetryEntity>,
    private readonly entityManager: EntityManager,
  ) {}

  /**
   * Hook executed once NestJS database connection boot completes.
   * This converts the `weather_telemetry` table into a TimescaleDB Hypertable
   * partitioned along the time dimension (`timestamp`) for optimized time-series storage.
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Checking weather_telemetry database configuration status...');

      // Query timescale metadata to verify if it's already a hypertable
      const checkResult = await this.entityManager.query(
        `SELECT * FROM timescaledb_information.hypertables WHERE hypertable_name = 'weather_telemetry'`,
      );

      if (checkResult.length === 0) {
        this.logger.log('weather_telemetry is not a hypertable. Initiating TimescaleDB hypertable conversion...');
        
        // Execute TimescaleDB API command to enable hypertable capabilities
        await this.entityManager.query(
          `SELECT create_hypertable('weather_telemetry', 'timestamp', if_not_exists => TRUE);`,
        );
        this.logger.log('Successfully converted weather_telemetry into a TimescaleDB hypertable!');
      } else {
        this.logger.log('weather_telemetry is already correctly configured as a TimescaleDB hypertable.');
      }
    } catch (error) {
      this.logger.warn(
        `TimescaleDB hypertable configuration check skipped or failed: ${error.message}`,
      );
      this.logger.log(
        'Note: This is expected if the Timescale extension is not enabled or if the database container is still booting.',
      );
    }
  }

  /**
   * Persists the validated weather station telemetry payload to TimescaleDB.
   */
  async saveTelemetry(topic: string, payload: CreateTelemetryDto): Promise<TelemetryEntity> {
    const topicParts = topic.split('/');
    const domain = topicParts[1] || 'unknown_domain';
    const deviceId = topicParts[2] || 'unknown_device';

    const telemetry = new TelemetryEntity();
    telemetry.timestamp = new Date(payload.timestamp);
    telemetry.station_id = payload.station_id;
    telemetry.uptime_seconds = payload.uptime_seconds;
    telemetry.boot_count = payload.boot_count;
    telemetry.sensors = payload.sensors;
    telemetry.topic = topic;
    telemetry.domain = domain;
    telemetry.device_id = deviceId;
    telemetry.received_at = new Date();

    const savedRecord = await this.telemetryRepository.save(telemetry);

    this.logger.log(
      `[DATABASE SAVE] Successfully saved telemetry record to TimescaleDB for station ${payload.station_id} at timestamp ${payload.timestamp}.`,
    );

    return savedRecord;
  }

  /**
   * Fetches paginated telemetry records (supports lazy loading/load more on frontend).
   */
  async getPaginatedTelemetry(query: TelemetryPaginationQueryDto) {
    const { page = 1, limit = 20, station_id } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.telemetryRepository.createQueryBuilder('telemetry');

    if (station_id) {
      queryBuilder.where('telemetry.station_id = :station_id', { station_id });
    }

    queryBuilder
      .orderBy('telemetry.timestamp', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    const hasNextPage = total > page * limit;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        hasNextPage,
      },
    };
  }

  /**
   * Fetches the absolute latest telemetry record, optionally filtered by station_id.
   */
  async getLatestTelemetry(query: TelemetryLatestQueryDto): Promise<TelemetryEntity | null> {
    const queryBuilder = this.telemetryRepository.createQueryBuilder('telemetry');

    if (query.station_id) {
      queryBuilder.where('telemetry.station_id = :station_id', { station_id: query.station_id });
    }

    return queryBuilder
      .orderBy('telemetry.timestamp', 'DESC')
      .getOne();
  }

  /**
   * Fetches telemetry records within a specific date-time range.
   */
  async getTelemetryByRange(query: TelemetryRangeQueryDto) {
    const { start, end, station_id, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.telemetryRepository.createQueryBuilder('telemetry')
      .where('telemetry.timestamp >= :start', { start: new Date(start) })
      .andWhere('telemetry.timestamp <= :end', { end: new Date(end) });

    if (station_id) {
      queryBuilder.andWhere('telemetry.station_id = :station_id', { station_id });
    }

    queryBuilder
      .orderBy('telemetry.timestamp', 'ASC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    const hasNextPage = total > page * limit;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        hasNextPage,
      },
    };
  }

  /**
   * Fetches aggregated sensor information, identifying active stations and their sensors.
   */
  async getSensorsInfo(): Promise<any[]> {
    // Fetches the most recent telemetry from each distinct station
    const latestRecords = await this.entityManager.query(`
      SELECT DISTINCT ON (station_id) 
        station_id, 
        timestamp, 
        sensors, 
        device_id, 
        domain 
      FROM weather_telemetry 
      ORDER BY station_id, timestamp DESC
    `);

    return latestRecords.map((record: any) => {
      const sensorsList = Object.keys(record.sensors || {}).map((sensorKey) => {
        const sensorData = record.sensors[sensorKey];
        return {
          name: sensorKey,
          status: sensorData?.status || 'UNKNOWN',
          data: { ...sensorData },
        };
      });

      return {
        station_id: record.station_id,
        device_id: record.device_id,
        domain: record.domain,
        last_seen: record.timestamp,
        sensors: sensorsList,
      };
    });
  }
}
