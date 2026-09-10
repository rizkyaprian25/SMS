import { IsInt, IsOptional, IsUUID, Matches, MaxLength, Min } from 'class-validator';

export class CreateRombelDto {
  @IsUUID()
  tingkatId!: string;

  @IsUUID()
  tahunAjaranId!: string;

  /** Contoh 7A. Format divalidasi, tapi daftar nilai TIDAK hard-code (ambil Tingkat dari API). */
  @Matches(/^[7-9][A-Z]$/, { message: 'nama harus seperti 7A, 8B, 9G' })
  @MaxLength(10)
  nama!: string;

  @IsOptional()
  @IsUUID()
  waliKelasId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  kapasitas?: number = 32;
}
