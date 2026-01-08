import { IsDateString, IsNumber, IsOptional } from 'class-validator';

export class UpdateReadingDto {
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @IsOptional()
  @IsNumber()
  value?: number;
}

