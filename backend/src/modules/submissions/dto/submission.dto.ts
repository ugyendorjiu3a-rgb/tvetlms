import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class SubmissionFileDto {
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsString()
  @IsNotEmpty()
  fileHash!: string; // SHA-256, computed client-side (architecture.md §6)

  @IsOptional()
  @IsString()
  fileUrl?: string; // set once the file has actually reached object storage; null while only queued

  @IsOptional()
  @IsInt()
  @Min(0)
  fileSizeBytes?: number;
}

// A trainee's client can generate `id` and `createdAtClient` offline (architecture.md §5 — UUID
// PKs exist specifically so this works) and submit exactly the same payload once it reaches the
// Edge Node, whether that happens instantly or days later — this DTO is what makes that possible.
export class CreateSubmissionDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  assignmentId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmissionFileDto)
  files!: SubmissionFileDto[];

  @IsOptional()
  @IsUUID()
  originDeviceId?: string;

  @IsOptional()
  @IsISO8601()
  submittedAtClient?: string; // when the trainee actually hit "submit" on-device, may predate sync

  @IsOptional()
  @IsIn(['local_only', 'pending_sync', 'synced'])
  syncStatus?: string;
}

export class CreateCommentDto {
  @IsOptional()
  @IsString()
  commentText?: string;

  @IsOptional()
  @IsString()
  voiceNoteUrl?: string;

  @IsOptional()
  @IsUUID()
  parentCommentId?: string;

  @IsOptional()
  @IsUUID()
  originDeviceId?: string;
}
