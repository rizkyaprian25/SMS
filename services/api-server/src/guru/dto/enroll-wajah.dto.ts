import { Equals, IsBoolean, IsString, MinLength } from 'class-validator';

export class EnrollWajahDto {
  /** Embedding hasil pemindaian on-device. Prod wajib terenkripsi (KMS) — lihat docs/09. */
  @IsString()
  @MinLength(32)
  embedding!: string;

  /** Consent UU PDP — harus true, tanpa kecuali. */
  @IsBoolean()
  @Equals(true, { message: 'consent wajib dicentang' })
  consent!: true;
}
