import { IsString, IsEnum, IsUUID, IsOptional, IsObject } from 'class-validator';

export enum ExternalSystemType {
  POWER_GRID = 'POWER_GRID',
  SCADA = 'SCADA',
  EMS = 'EMS',
  DMS = 'DMS',
  AMI = 'AMI',
  OTHER = 'OTHER',
}

export enum ExternalSystemStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  PENDING = 'PENDING',
}

export class CreateExternalSystemDto {
  @IsString()
  systemId: string;

  @IsString()
  name: string;

  @IsEnum(ExternalSystemType)
  type: ExternalSystemType;

  @IsUUID()
  siteId: string;

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

