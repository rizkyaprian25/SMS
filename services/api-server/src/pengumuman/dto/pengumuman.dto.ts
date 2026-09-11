import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Role } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class CreatePengumumanDto {
  @IsString()
  judul!: string;

  @IsString()
  isi!: string;

  /** Role penerima. Fase 2 tinggal tambah SISWA / ORANG_TUA. */
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Role, { each: true })
  targetRole!: Role[];

  /** null = semua rombel. */
  @IsOptional()
  @IsUUID()
  targetRombelId?: string;
}

export class QueryPengumumanDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsUUID()
  rombelId?: string;
}
