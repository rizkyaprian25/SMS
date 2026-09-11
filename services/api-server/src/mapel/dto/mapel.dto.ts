import { IsOptional, IsString } from 'class-validator';

export class CreateMapelDto {
  @IsString()
  kode!: string;

  @IsString()
  nama!: string;

  @IsOptional()
  @IsString()
  kelompok?: string;
}
