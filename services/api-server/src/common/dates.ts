/**
 * Jam sensitif selalu UTC di server (tampil WIB di UI).
 * Satu tempat agar tidak ada format tanggal berserakan per service.
 */

/** 'YYYY-MM-DD' -> awal hari UTC. */
export function awalHariUTC(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Awal hari UTC hari ini (jam server). */
export function hariIniUTC(): Date {
  return new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');
}
