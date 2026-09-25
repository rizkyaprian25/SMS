/** Factory query key — semua key list terpusat di sini (skill sms-web-model). */

export const qk = {
  ringkasan: ['ringkasan'] as const,
  rombel: (tahunAjaranId?: string, tingkatId?: string, page = 1) =>
    ['rombel', tahunAjaranId ?? '', tingkatId ?? '', page] as const,
  siswa: (tahunAjaranId: string, rombelId: string, q: string, page: number) =>
    ['siswa', tahunAjaranId, rombelId, q, page] as const,
  guru: (q: string, page = 1) => ['guru', q, page] as const,
  mapel: ['mapel'] as const,
  jadwal: (rombelId: string, guruId: string, hari: string) =>
    ['jadwal', rombelId, guruId, hari] as const,
  absensi: (rombelId: string, mapelId: string, tanggal: string, status: string, page: number) =>
    ['absensi', rombelId, mapelId, tanggal, status, page] as const,
  absensiRekap: (params: Record<string, string>) =>
    ['absensi-rekap', params] as const,
  absensiGuru: (dari: string, sampai: string) => ['absensi-guru', dari, sampai] as const,
  nilai: (rombelId: string, mapelId: string, semester: string, jenis: string) =>
    ['nilai', rombelId, mapelId, semester, jenis] as const,
  bobotNilai: (mapelId: string, tahunAjaranId: string) =>
    ['bobot-nilai', mapelId, tahunAjaranId] as const,
  perizinan: (status: string) => ['perizinan', status] as const,
  pengumuman: ['pengumuman'] as const,
  pelanggaran: (siswaId: string) => ['pelanggaran', siswaId] as const,
};
