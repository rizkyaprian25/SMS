import { IsOptional, IsString, IsUUID } from 'class-validator';

export class HubungkanAnakDto {
  @IsUUID()
  ortuId: string;

  @IsUUID()
  siswaId: string;

  @IsOptional()
  @IsString()
  hubungan?: string;
}
