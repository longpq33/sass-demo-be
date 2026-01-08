import { IsOptional, IsString } from 'class-validator';

export class CreateMeterDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsString()
  siteId: string;
}
