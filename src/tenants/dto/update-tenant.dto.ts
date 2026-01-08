import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TenantStatus } from './create-tenant.dto';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;
}
