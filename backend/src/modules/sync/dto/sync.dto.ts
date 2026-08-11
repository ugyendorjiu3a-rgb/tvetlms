import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @IsIn(['mobile', 'desktop', 'web'])
  deviceType!: 'mobile' | 'desktop' | 'web';

  @IsString()
  @IsNotEmpty()
  installId!: string; // stable client-generated identifier, persisted on-device across app restarts
}

export class ResolveConflictDto {
  @IsIn(['keep_server', 'keep_client'])
  resolution!: 'keep_server' | 'keep_client';

  @IsOptional()
  @IsString()
  notes?: string;
}
