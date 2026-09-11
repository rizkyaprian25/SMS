import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { JenisIzin } from '@prisma/client';

export class CreatePerizinanDto {
  @IsUUID()
  siswaId!: string;

  @IsDateString()
  tglMulai!: string;

  @IsDateString()
  tglSelesai!: string;

  @IsEnum(JenisIzin)
  jenis!: JenisIzin;

  @IsString()
  alasan!: string;

  @IsOptional()
  @IsString()
  lampiranUrl?: string;
}

export class PutuskanIzinDto {
  @IsEnum(['SETUJU', 'TOLAK'] as const)
  putusan!: 'SETUJU' | 'TOLAK';

  @IsOptional()
  @IsString()
  catatan?: string;
}
