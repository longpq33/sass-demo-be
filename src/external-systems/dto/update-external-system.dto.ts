import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ExternalSystemStatus } from './create-external-system.dto';

export class UpdateExternalSystemDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ExternalSystemStatus)
  status?: ExternalSystemStatus;

  @IsOptional()
  @IsString()
  mqttUsername?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

