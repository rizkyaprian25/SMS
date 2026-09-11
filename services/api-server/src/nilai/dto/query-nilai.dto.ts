import { IsEnum, IsOptional, IsString } from 'class-validator';
import { JenisNilai, Semester } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryNilaiDto extends PaginationQueryDto {
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
