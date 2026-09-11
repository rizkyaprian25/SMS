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

// === FASE 2: Siswa, Orang Tua, Tugas, & Percakapan ===

export const HubunganOrtu = {
  AYAH: 'AYAH',
  IBU: 'IBU',
  WALI: 'WALI',
} as const;
export type HubunganOrtu = (typeof HubunganOrtu)[keyof typeof HubunganOrtu];

export interface OrtuAnakItem {
  id: string;
  ortu_id: string;
  siswa_id: string;
  hubungan?: string;
  siswa: {
    id: string;
    nama: string;
    nisn: string;
    rombel_id?: string | null;
    rombel?: {
      id: string;
      nama: string;
    } | null;
  };
}

export interface TugasItem {
  id: string;
  rombel_id: string;
  mapel_id: string;
  guru_id: string;
  judul: string;
  deskripsi: string;
  tenggat_waktu: string;
  file_url?: string | null;
  created_at: string;
  rombel?: { id: string; nama: string };
  mapel?: { id: string; nama: string; kode: string };
  guru?: { id: string; nama: string };
}

export interface CreateTugasRequest {
  rombel_id: string;
  mapel_id: string;
  judul: string;
  deskripsi: string;
  tenggat_waktu: string; // ISO 8601 UTC
  file_url?: string;
}

export interface KumpulTugasRequest {
  file_url: string;
  catatan?: string;
}

export interface NilaiTugasRequest {
  nilai: number; // 0 - 100
  catatan_guru?: string;
}

export interface PengumpulanTugasItem {
  id: string;
  tugas_id: string;
  siswa_id: string;
  file_url: string;
  catatan?: string | null;
  nilai?: number | null;
  catatan_guru?: string | null;
  dikumpulkan_pada: string;
  dinilai_pada?: string | null;
  siswa?: { id: string; nama: string; nisn: string };
}

export interface PercakapanItem {
  id: string;
  wali_id: string;
  ortu_id: string;
  siswa_id: string;
  created_at: string;
  updated_at: string;
  wali?: { id: string; nama: string };
  ortu?: { id: string; email: string };
  siswa?: { id: string; nama: string };
  terakhir_pesan?: string;
}

export interface PesanItem {
  id: string;
  percakapan_id: string;
  pengirim_id: string;
  isi: string;
  is_dibaca: boolean;
  created_at: string;
  pengirim?: { id: string; email: string; role: Role };
}

export interface KirimPesanRequest {
  isi: string;
}

