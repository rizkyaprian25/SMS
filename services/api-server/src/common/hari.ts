import { Hari } from '@prisma/client';

/** getUTCDay (0=Minggu..6=Sabtu) -> Hari sekolah. Minggu = null (libur). */
export const HARI_DARI_JS: Record<number, Hari | null> = {
  0: null,
  1: Hari.SENIN,
  2: Hari.SELASA,
  3: Hari.RABU,
  4: Hari.KAMIS,
  5: Hari.JUMAT,
  6: Hari.SABTU,
};
