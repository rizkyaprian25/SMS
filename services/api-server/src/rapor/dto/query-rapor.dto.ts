import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Semester } from '@prisma/client';

export class QueryRaporDto {
  @IsOptional()
  @IsEnum(Semester)
  semester?: Semester;

  @IsOptional()
  @IsUUID()
  tahunAjaranId?: string;
}
