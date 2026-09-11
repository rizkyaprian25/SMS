import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Hari } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryJadwalDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  rombelId?: string;

  @IsOptional()
  @IsUUID()
  guruId?: string;

  @IsOptional()
  @IsEnum(Hari)
  hari?: Hari;
}
