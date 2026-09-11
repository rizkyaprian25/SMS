import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { JenisNilai, Semester } from '@prisma/client';

export class NilaiItemDto {
  @IsUUID()
  siswaId!: string;

  /** 0–100, 2 desimal. */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  nilai!: number;
}

export class NilaiBulkDto {
  @IsUUID()
  mapelId!: string;

  @IsUUID()
  tahunAjaranId!: string;

  @IsEnum(Semester)
  semester!: Semester;

  @IsEnum(JenisNilai)
  jenis!: JenisNilai;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NilaiItemDto)
  items!: NilaiItemDto[];
}
