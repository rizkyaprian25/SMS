import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryRombelDto extends PaginationQueryDto {
  /** Wajib diisi client — rombel selalu dibaca dalam konteks 1 tahun ajaran. */
  @IsOptional()
  @IsUUID()
  tahunAjaranId?: string;

  @IsOptional()
  @IsUUID()
  tingkatId?: string;
}

export class QueryRombelSiswaDto {
  /** YYYY-MM-DD — bila diisi, sertakan status absensi tiap siswa hari itu. */
  @IsOptional()
  @IsDateString()
  tanggal?: string;
}
