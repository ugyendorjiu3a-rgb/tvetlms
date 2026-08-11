import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateModuleDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  nameEn!: string;

  @IsOptional()
  @IsString()
  nameDz?: string;

  @IsOptional()
  @IsString()
  ncsCode?: string;

  @IsUUID()
  tradeId!: string;

  @IsInt()
  @Min(1)
  durationWeeks!: number;

  @IsOptional()
  @IsString()
  learningOutcome?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsUUID()
  moduleTutorId?: string;
}

export class EnrollTraineeDto {
  @IsUUID()
  traineeId!: string;
}

export class AssignTrainerDto {
  @IsUUID()
  trainerId!: string;

  @IsOptional()
  @IsString()
  roleLabel?: 'tutor' | 'assistant';
}
