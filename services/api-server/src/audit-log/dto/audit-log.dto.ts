import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryAuditLogDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  aksi?: string;

  @IsOptional()
  @IsString()
  entitas?: string;
}
