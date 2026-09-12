import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryPenggunaDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class CreatePenggunaDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsUUID()
  guruId?: string;

  @IsOptional()
  @IsUUID()
  siswaId?: string;
}

export class UpdatePenggunaDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsUUID()
  guruId?: string;

  @IsOptional()
  @IsUUID()
  siswaId?: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  @MinLength(6)
  passwordBaru: string;
}
