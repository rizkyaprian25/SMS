import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class UpsertBobotNilaiDto {
  @IsUUID()
  mapelId!: string;

  @IsUUID()
  tahunAjaranId!: string;

  @IsOptional()
  @IsUUID()
  guruId?: string;

  /** Persentase bobot nilai tugas (0–100) */
  @IsInt()
  @Min(0)
  @Max(100)
  bobotTugas!: number;

  /** Persentase bobot nilai ulangan harian (0–100) */
  @IsInt()
  @Min(0)
  @Max(100)
  bobotHarian!: number;

  /** Persentase bobot nilai UTS (0–100) */
  @IsInt()
  @Min(0)
  @Max(100)
  bobotUts!: number;

  /** Persentase bobot nilai UAS (0–100) */
  @IsInt()
  @Min(0)
  @Max(100)
  bobotUas!: number;
}

export class QueryBobotNilaiDto {
  @IsUUID()
  mapelId!: string;

  @IsOptional()
  @IsUUID()
  tahunAjaranId?: string;

  @IsOptional()
  @IsUUID()
  guruId?: string;
}
