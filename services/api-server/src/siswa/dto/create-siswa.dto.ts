import { IsDateString, IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateSiswaDto {
  /** NISN 10 digit. */
  @Matches(/^\d{10}$/, { message: 'nisn harus 10 digit angka' })
  nisn!: string;

  @IsString()
  @MaxLength(100)
  nama!: string;

  @IsOptional()
  @IsString()
  rombelId?: string;

  @IsOptional()
  @IsString()
  jenisKelamin?: string;

  @IsOptional()
  @IsDateString()
  tglLahir?: string;

  @IsOptional()
  @IsString()
  fotoUrl?: string;

  /** { nama_ayah, nama_ibu, no_hp, alamat } — dipakai penuh di Fase 2 (ortu). */
  @IsOptional()
  @IsObject()
  dataOrtu?: Record<string, unknown>;
}
