// Single source of truth untuk enum lintas backend + web.
// Mobile (Dart) generate dari openapi.yaml — jangan duplikat manual di Dart.

export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  KEPALA_SEKOLAH: 'KEPALA_SEKOLAH',
  GURU_MAPEL: 'GURU_MAPEL',
  WALI_KELAS: 'WALI_KELAS',
  GURU_BK: 'GURU_BK',
  SISWA: 'SISWA',
  ORANG_TUA: 'ORANG_TUA',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const StatusKehadiran = {
  HADIR: 'HADIR',
  IZIN: 'IZIN',
  SAKIT: 'SAKIT',
  ALPA: 'ALPA',
} as const;
export type StatusKehadiran = (typeof StatusKehadiran)[keyof typeof StatusKehadiran];

export const Semester = { GANJIL: 'GANJIL', GENAP: 'GENAP' } as const;
export type Semester = (typeof Semester)[keyof typeof Semester];

export const Hari = {
  SENIN: 'SENIN',
  SELASA: 'SELASA',
  RABU: 'RABU',
  KAMIS: 'KAMIS',
  JUMAT: 'JUMAT',
  SABTU: 'SABTU',
} as const;
export type Hari = (typeof Hari)[keyof typeof Hari];

export const JenisNilai = {
  TUGAS: 'TUGAS',
  HARIAN: 'HARIAN',
  UTS: 'UTS',
  UAS: 'UAS',
  SUMATIF: 'SUMATIF',
} as const;
export type JenisNilai = (typeof JenisNilai)[keyof typeof JenisNilai];

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

export interface AbsensiBulkItem {
  siswa_id: string;
  status: StatusKehadiran;
  keterangan?: string;
}

export interface AbsensiBulkRequest {
  tanggal: string; // YYYY-MM-DD
  rombel_id: string;
  mapel_id: string;
  jam_ke: number;
  alasan_override?: string;
  items: AbsensiBulkItem[];
}
