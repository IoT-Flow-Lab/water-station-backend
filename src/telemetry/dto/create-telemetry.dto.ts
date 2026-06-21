import { IsString, IsNotEmpty, IsNumber, IsISO8601, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class Dht11SensorDto {
  @IsString()
  @IsNotEmpty()
  status: string;

  @IsNumber()
  temperature_c: number;

  @IsNumber()
  humidity_pct: number;
}

export class Bmp280SensorDto {
  @IsString()
  @IsNotEmpty()
  status: string;

  @IsNumber()
  temperature_c: number;

  @IsNumber()
  pressure_hpa: number;
}

export class SensorsDto {
  @ValidateNested()
  @Type(() => Dht11SensorDto)
  @IsOptional()
  dht11?: Dht11SensorDto;

  @ValidateNested()
  @Type(() => Bmp280SensorDto)
  @IsOptional()
  bmp280?: Bmp280SensorDto;
}

export class CreateTelemetryDto {
  @IsString()
  @IsNotEmpty()
  station_id: string;

  @IsISO8601()
  timestamp: string;

  @IsNumber()
  uptime_seconds: number;

  @IsNumber()
  boot_count: number;

  @ValidateNested()
  @Type(() => SensorsDto)
  sensors: SensorsDto;
}
