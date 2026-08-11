import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTraineeDto {
  @IsUUID()
  institutionId!: string;

  @IsString()
  @IsNotEmpty()
  loginId!: string; // Student ID

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  citizenshipId!: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsUUID()
  tradeId?: string;

  @IsDateString()
  enrollmentDate!: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;
}
