import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateGuruDto {
  @IsString()
  nip!: string;

  @IsString()
  @MaxLength(100)
  nama!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role = Role.GURU_MAPEL;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mapelIds?: string[];
}

export class UpdateGuruDto {
  @IsOptional()
  @IsString()
  nip?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nama?: string;

  @IsOptional()
  @IsString()
  fotoUrl?: string;
}

export class SetMapelDto {
  @IsArray()
  @IsString({ each: true })
  mapelIds!: string[];
}
