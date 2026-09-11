import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryTugasDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  rombelId?: string;

  @IsOptional()
  @IsUUID()
  mapelId?: string;
}
