import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { JenisNilai, Semester } from '@prisma/client';

export class ExportAbsensiDto {
  @IsOptional()
  @IsString()
  rombelId?: string;

  @IsOptional()
  @IsString()
  mapelId?: string;

  @IsOptional()
  @IsDateString()
  dari?: string;

  @IsOptional()
  @IsDateString()
  sampai?: string;
}

export class ExportNilaiDto {
  @IsOptional()
  @IsString()
  rombelId?: string;

  @IsOptional()
  @IsString()
  mapelId?: string;

  @IsOptional()
  @IsEnum(Semester)
  semester?: Semester;

  @IsOptional()
  @IsEnum(JenisNilai)
  jenis?: JenisNilai;
}
