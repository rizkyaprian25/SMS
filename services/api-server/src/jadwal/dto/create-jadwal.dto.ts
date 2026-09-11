import { IsEnum, IsInt, IsOptional, IsUUID, Matches, Min } from 'class-validator';
import { Hari } from '@prisma/client';

export class CreateJadwalDto {
  @IsUUID()
  rombelId!: string;

  @IsUUID()
  mapelId!: string;

  @IsUUID()
  guruId!: string;

  @IsEnum(Hari)
  hari!: Hari;

  /** Format JJ:MM, contoh 07:00. */
  @Matches(/^\d{2}:\d{2}$/)
  jamMulai!: string;

  @Matches(/^\d{2}:\d{2}$/)
  jamSelesai!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  jamKe?: number;
}
