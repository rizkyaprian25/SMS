import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class PresensiMasukDto {
  /** Skor kemiripan dari pencocokan on-device (0–1). */
  @IsNumber()
  faceScore!: number;

  /** Hasil liveness detection lokal. Tanpa ini = tolak. */
  @IsBoolean()
  liveness!: boolean;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class PresensiFallbackDto {
  @IsString()
  alasan!: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}
