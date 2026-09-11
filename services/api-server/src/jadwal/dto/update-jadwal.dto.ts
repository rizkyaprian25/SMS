import { IsEnum, IsInt, IsOptional, IsUUID, Matches, Min } from 'class-validator';
import { Hari } from '@prisma/client';

export class UpdateJadwalDto {
  @IsOptional()
  @IsUUID()
  rombelId?: string;

  @IsOptional()
  @IsUUID()
  mapelId?: string;

  @IsOptional()
  @IsUUID()
  guruId?: string;

  @IsOptional()
  @IsEnum(Hari)
  hari?: Hari;

  /** Format JJ:MM, contoh 07:00. */
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  jamMulai?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  jamSelesai?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  jamKe?: number;
}
