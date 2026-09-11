import { IsDateString, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSiswaDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nama?: string;

  @IsOptional()
  @IsString()
  rombelId?: string | null;

  @IsOptional()
  @IsString()
  jenisKelamin?: string;

  @IsOptional()
  @IsDateString()
  tglLahir?: string;

  @IsOptional()
  @IsString()
  fotoUrl?: string;

  @IsOptional()
  @IsObject()
  dataOrtu?: Record<string, unknown>;
}
