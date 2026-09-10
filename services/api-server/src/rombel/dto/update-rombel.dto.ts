import { IsInt, IsOptional, IsUUID, Matches, MaxLength, Min } from 'class-validator';

/** Semua field opsional — rename / ganti wali / kapasitas / arsip parsial. */
export class UpdateRombelDto {
  @IsOptional()
  @Matches(/^[7-9][A-Z]$/, { message: 'nama harus seperti 7A, 8B, 9G' })
  @MaxLength(10)
  nama?: string;

  @IsOptional()
  @IsUUID()
  waliKelasId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  kapasitas?: number;
}
