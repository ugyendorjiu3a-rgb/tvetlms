import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTradeDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  nameEn!: string;

  @IsOptional()
  @IsString()
  nameDz?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  descriptionDz?: string;
}
