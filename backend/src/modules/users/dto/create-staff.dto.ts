import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

// Admin / Exam Controller accounts. NOTE: database-design.md only defines personal-identity
// profile tables for trainees and trainers (trainee_profiles / trainer_profiles) — Admin and
// Exam Controller roles have no equivalent profile table in the current schema. This is a known
// gap in the design docs, not an oversight here; staff accounts are identified by loginId/email
// only until the Ministry confirms whether an admin_profiles-style table is actually needed.
export class CreateStaffDto {
  @IsUUID()
  institutionId!: string;

  @IsString()
  @IsNotEmpty()
  loginId!: string; // Staff ID

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsIn(['admin', 'exam_controller'])
  role!: 'admin' | 'exam_controller';
}
