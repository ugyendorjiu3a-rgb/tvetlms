import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTrainerDto {
  @IsUUID()
  institutionId!: string;

  @IsString()
  @IsNotEmpty()
  loginId!: string; // Staff ID

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  staffId!: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;
}
