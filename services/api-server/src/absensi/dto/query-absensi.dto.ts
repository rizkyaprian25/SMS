import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusKehadiran } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryAbsensiDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  rombelId?: string;

  @IsOptional()
  @IsString()
  mapelId?: string;

  @IsOptional()
  @IsDateString()
  tanggal?: string;

  @IsOptional()
  @IsEnum(StatusKehadiran)
  status?: StatusKehadiran;
}

export class RekapAbsensiDto {
  @IsOptional()
  @IsString()
  rombelId?: string;

  @IsOptional()
  @IsString()
  mapelId?: string;

  @IsOptional()
  @IsDateString()
  dari?: string;

  @IsOptional()
  @IsDateString()
  sampai?: string;
}
