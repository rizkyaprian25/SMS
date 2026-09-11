import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateNilaiDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  nilai!: number;

  @IsOptional()
  @IsString()
  keterangan?: string;
}
