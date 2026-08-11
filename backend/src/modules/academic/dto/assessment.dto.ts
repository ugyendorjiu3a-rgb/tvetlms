import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

const TIERS = ['formative', 'diagnostic', 'summative'] as const;
const SUBTYPES = [
  'continuous_assessment',
  'project_based',
  'class_test',
  'problem_based',
  'module_assessment',
  'institutional_assessment',
] as const;

export class CreateAssessmentDto {
  @IsUUID()
  moduleId!: string;

  @IsIn(TIERS)
  tier!: (typeof TIERS)[number];

  @IsIn(SUBTYPES)
  subtype!: (typeof SUBTYPES)[number];

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsNumber()
  @Min(0.01)
  maxScore!: number;

  @IsOptional()
  @IsNumber()
  weightPercent?: number;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;
}

export class CreateAssignmentDto {
  @IsUUID()
  assessmentId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString({ each: true })
  allowedFileTypes!: string[];

  @IsDateString()
  dueDate!: string;
}
