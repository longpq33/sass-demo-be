import { IsDateString, IsOptional, IsString } from 'class-validator';

export class QueryReadingsDto {
  @IsString()
  meterId: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
