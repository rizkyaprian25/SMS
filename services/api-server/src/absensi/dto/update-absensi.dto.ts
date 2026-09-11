import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusKehadiran } from '@prisma/client';

export class UpdateAbsensiDto {
  @IsOptional()
  @IsEnum(StatusKehadiran)
  status?: StatusKehadiran;

  @IsOptional()
  @IsString()
  keterangan?: string;
}
