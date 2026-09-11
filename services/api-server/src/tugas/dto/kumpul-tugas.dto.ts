import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class KumpulTugasDto {
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsOptional()
  @IsString()
  catatan?: string;
}
