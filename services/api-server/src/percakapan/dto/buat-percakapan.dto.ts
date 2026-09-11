import { IsUUID } from 'class-validator';

export class BuatPercakapanDto {
  @IsUUID()
  siswaId: string;
}
