import { IsInt, IsNumber, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AutoGradeDto {
  @IsNumber()
  @Min(0)
  score!: number;

  @IsString()
  engineVersion!: string;

  @IsObject()
  rawResult!: Record<string, unknown>; // per-question breakdown (database-design.md auto_grade_logs.raw_result)
}

export class ManualGradeDto {
  @IsNumber()
  @Min(0)
  score!: number;

  // The `version` of the Grade record this client last saw. Omitted on first grade. Required on
  // every subsequent edit so the server can detect a concurrent offline edit from a second device
  // (architecture.md §7 tiered conflict strategy — grades never silently auto-merge).
  @IsOptional()
  @IsInt()
  expectedVersion?: number;

  @IsOptional()
  @IsUUID()
  originDeviceId?: string;
}

export class ReviewGradeDto {
  @IsString()
  gradingStatus!: 'reviewed' | 'disputed';

  @IsOptional()
  @IsString()
  notes?: string;
}
