import { IsNotEmpty, IsString } from 'class-validator';

export class KirimPesanDto {
  @IsString()
  @IsNotEmpty()
  isi: string;
}
