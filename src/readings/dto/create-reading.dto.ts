import { IsDateString, IsNumber, IsString } from 'class-validator';

export class CreateReadingDto {
  @IsString()
  meterId: string;

  @IsDateString()
  timestamp: string;

  @IsNumber()
  value: number;
}
