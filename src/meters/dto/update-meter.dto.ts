import { IsOptional, IsString } from 'class-validator';

export class UpdateMeterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  unit?: string;
}
