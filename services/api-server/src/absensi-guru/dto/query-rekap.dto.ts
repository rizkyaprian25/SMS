import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryRekapGuruDto {
  @IsOptional()
  @IsDateString()
  dari?: string;

  @IsOptional()
  @IsDateString()
  sampai?: string;

  @IsOptional()
  @IsString()
  guruId?: string;
}

export class VerifikasiFallbackDto {
  @IsEnum(['SETUJU', 'TOLAK'] as const)
  putusan!: 'SETUJU' | 'TOLAK';
}
