import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ComputeResultDto {
  @IsUUID()
  traineeId!: string;

  @IsUUID()
  moduleId!: string;
}

export class DisputeResultDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
