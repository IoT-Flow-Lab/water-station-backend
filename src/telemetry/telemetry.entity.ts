import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('weather_telemetry')
export class TelemetryEntity {
  @PrimaryColumn({ type: 'timestamp' })
  timestamp: Date;

  @PrimaryColumn({ type: 'varchar', length: 50 })
  station_id: string;

  @Column({ type: 'integer' })
  uptime_seconds: number;

  @Column({ type: 'integer' })
  boot_count: number;

  // Stores all sensor readings (like DHT11, BMP280, etc.) in a JSONB binary block
  @Column({ type: 'jsonb' })
  sensors: Record<string, any>;

  // Metadata extracted from the MQTT topic parameters
  @Column({ type: 'varchar', length: 100 })
  topic: string;

  @Column({ type: 'varchar', length: 100 })
  domain: string;

  @Column({ type: 'varchar', length: 50 })
  device_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  received_at: Date;
}
