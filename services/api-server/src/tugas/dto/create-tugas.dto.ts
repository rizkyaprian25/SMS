import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTugasDto {
  @IsUUID()
  rombelId: string;

  @IsUUID()
  mapelId: string;

  @IsString()
  @IsNotEmpty()
  judul: string;

  @IsString()
  @IsNotEmpty()
  deskripsi: string;

  @IsDateString()
  tenggatWaktu: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}
