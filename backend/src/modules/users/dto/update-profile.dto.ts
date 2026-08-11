import { IsDateString, IsEmail, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

// Self-service edit — matches the PRD §5.1 edit-accessibility rule: a Trainee/Trainer may only
// touch their own contact fields, never Citizenship ID, name, or academic/score data.
export class UpdateOwnProfileDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;
}

// Admin-only full edit of a trainee's personal-identity record (PRD §5.1: "Admin for all updates
// and changes").
export class AdminUpdateTraineeDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  citizenshipId?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @IsOptional()
  @IsUUID()
  tradeId?: string;

  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;

  @IsOptional()
  @IsIn(['active', 'completed', 'withdrawn']) // 'eradicated' is only reachable via the eradication workflow, not a direct edit
  status?: string;
}

export class RequestEradicationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
