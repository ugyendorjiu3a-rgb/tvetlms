import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateClassDto {
  @IsUUID()
  institutionId!: string;

  @IsUUID()
  tradeId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  intakeYear!: number;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class EnrollClassDto {
  @IsUUID()
  traineeId!: string;
}
