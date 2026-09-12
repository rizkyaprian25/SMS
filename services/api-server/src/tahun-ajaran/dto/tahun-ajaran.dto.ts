import { IsDateString, IsEnum, IsString } from 'class-validator';
import { Semester } from '@prisma/client';

export class CreateTahunAjaranDto {
  @IsString()
  nama!: string; // 2026/2027

  @IsEnum(Semester)
  semesterAktif!: Semester;

  @IsDateString()
  tglMulai!: string;

  @IsDateString()
  tglSelesai!: string;
}

export class UpdateTahunAjaranDto {
  @IsEnum(Semester)
  semesterAktif?: Semester;

  @IsString()
  nama?: string;

  @IsDateString()
  tglMulai?: string;

  @IsDateString()
  tglSelesai?: string;
}

