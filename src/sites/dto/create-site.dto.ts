import { IsOptional, IsString } from 'class-validator';

export class CreateSiteDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  address?: string;

  // Only system_admin should pass tenantId explicitly
  @IsOptional()
  @IsString()
  tenantId?: string;
}
