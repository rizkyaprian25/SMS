/** Factory query key — semua key list terpusat di sini (skill sms-web-model). */

export const qk = {
  ringkasan: ['ringkasan'] as const,
  rombel: (tahunAjaranId?: string, tingkatId?: string, page = 1) =>
    ['rombel', tahunAjaranId ?? '', tingkatId ?? '', page] as const,
  siswa: (tahunAjaranId: string, rombelId: string, q: string, page: number) =>
    ['siswa', tahunAjaranId, rombelId, q, page] as const,
  jadwalSaya: (hari: string) => ['jadwal-saya', hari] as const,
  absensiRekap: (params: Record<string, string>) =>
    ['absensi-rekap', params] as const,
};
