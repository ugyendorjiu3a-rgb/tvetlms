import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateResourceDto {
  @IsString()
  @IsNotEmpty()
  titleEn!: string;

  @IsOptional()
  @IsString()
  titleDz?: string;

  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @IsOptional()
  @IsString()
  ncsCode?: string;

  @IsString()
  @IsNotEmpty()
  format!: string;

  @IsOptional()
  @IsIn(['en', 'dz', 'both'])
  language?: string;

  @IsString()
  @IsNotEmpty()
  fileUrl!: string; // object storage key (architecture.md §6 — MinIO)

  @IsString()
  @IsNotEmpty()
  fileHash!: string; // SHA-256

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(['public', 'institution', 'module_only', 'trainer_only'])
  permissionLevel?: string;
}

export class ReviewResourceDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
