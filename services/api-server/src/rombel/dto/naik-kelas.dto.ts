import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class NaikKelasItemDto {
  @IsUUID()
  siswaId!: string;

  @IsUUID()
  rombelBaruId!: string;
}

export class NaikKelasDto {
  @IsUUID()
  dariTahunId!: string;

  @IsUUID()
  keTahunId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NaikKelasItemDto)
  mapping!: NaikKelasItemDto[];
}
