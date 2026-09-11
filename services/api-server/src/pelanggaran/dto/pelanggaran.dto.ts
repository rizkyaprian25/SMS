import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class CreatePelanggaranDto {
  @IsUUID()
  siswaId!: string;

  @IsDateString()
  tanggal!: string;

  @IsString()
  kategori!: string;

  @IsInt()
  @Min(0)
  poin!: number;

  @IsOptional()
  @IsString()
  keterangan?: string;
}

export class QueryPelanggaranDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  siswaId?: string;

  @IsOptional()
  @IsUUID()
  rombelId?: string;
}

export class UpdatePelanggaranDto {
  @IsOptional()
  @IsDateString()
  tanggal?: string;

  @IsOptional()
  @IsString()
  kategori?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  poin?: number;

  @IsOptional()
  @IsString()
  keterangan?: string;
}

