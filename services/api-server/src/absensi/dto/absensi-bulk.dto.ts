import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { StatusKehadiran } from '@prisma/client';

export class AbsensiItemDto {
  @IsUUID()
  siswaId!: string;

  @IsEnum(StatusKehadiran)
  status!: StatusKehadiran;

  @IsOptional()
  @IsString()
  keterangan?: string;
}

export class AbsensiBulkDto {
  @IsDateString()
  tanggal!: string; // YYYY-MM-DD

  @IsUUID()
  rombelId!: string;

  @IsUUID()
  mapelId!: string;

  @IsInt()
  @Min(1)
  jamKe!: number;

  /** Wajib diisi bila mengajar di luar jadwal (tercatat di audit). */
  @IsOptional()
  @IsString()
  alasanOverride?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AbsensiItemDto)
  items!: AbsensiItemDto[];
}
