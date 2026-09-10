# 02 — Desain Database (PostgreSQL + Prisma)

## 1. Prinsip

- `Rombel` selalu punya `tahunAjaranId`. Siswa ditempatkan via `PenempatanSiswa(rombelId, siswaId, tahunAjaranId)`, bukan `siswa.rombel_id` langsung — agar histori tidak hilang saat naik kelas.
- Seed 7A-7H, 8A-8G, 9A-9G hanya data awal. Tabel `tingkat` & `rombel` fully CRUD dari web.
- Soft delete untuk siswa/guru (`deletedAt`), hard delete dilarang untuk data akademik.
- Semua waktu simpan UTC (`timestamptz`), tampil WIB di UI.
- Face embedding terenkripsi (kolom `bytea`, enkripsi aplikasi AES-256-GCM, bukan plaintext).

## 2. ERD (teks)

```
TahunAjaran 1──* Semester 1──* Rombel *──* PenempatanSiswa *──1 Siswa 1──* OrangTua_Siswa *──1 OrangTua
Tingkat 1──* Rombel *──1 Guru(waliKelas)      Siswa 1──* Absensi *──1 Jadwal *──1 Mapel *──1 Guru(pengampu via PenugasanGuru)
Siswa 1──* Nilai *──1 Mapel    Siswa 1──* Perizinan    Siswa 1──* Pelanggaran
Guru 1──* AbsensiGuru(face)   Guru 1──* FaceEnrollment
User 1──1 Guru/Siswa/OrangTua (polimorfik via userableType+Id, atau FK nullable)
Pengumuman *──* TargetRombel    Device *──1 User (untuk FCM)
AuditLog (append-only)
```

## 3. Tabel Inti (kolom penting + index)

### tahun_ajaran
`id uuid pk, nama text unique (2026/2027), tanggalMulai date, tanggalSelesai date, aktif bool, createdAt`
Index: `aktif` partial.

### semester
`id, tahunAjaranId fk, nama (Ganjil/Genap), aktif bool, tanggalMulai, tanggalSelesai`
Unique: `(tahunAjaranId, nama)`.

### tingkat
`id, kode text unique (7/8/9), nama (Kelas 7), urutan int`

### rombel
`id, tahunAjaranId fk, tingkatId fk, nama text (7A), waliKelasId fk guru nullable, kapasitas int default 32`
Unique: `(tahunAjaranId, nama)`. Index: `(tahunAjaranId, tingkatId)`.

### siswa
`id, nisn varchar(10) unique, nis lokal unique, nama, jenisKelamin, tanggalLahir, fotoUrl nullable, status (AKTIF/PINDAH/LULUS/KELUAR), deletedAt nullable`
Index: `nama trigram (pg_trgm)`, `status`.

### penempatan_siswa (histori kelas)
`id, siswaId fk, rombelId fk, tahunAjaranId fk, semesterId fk nullable, tanggalMasuk date, tanggalKeluar nullable, status`
Unique aktif: partial index `(siswaId, tahunAjaranId) where tanggalKeluar is null`.
→ Kenaikan kelas = tutup baris lama + insert baris baru, dalam satu transaksi + audit log.

### guru
`id, nip varchar(18) unique nullable, nama, jenisKelamin, fotoUrl, status, faceEnrolled bool default false`

### mata_pelajaran
`id, kode unique (INF-7), nama (Informatika), tingkatId nullable (null = semua tingkat), kategori`

### penugasan_guru (guru boleh ajar banyak mapel × banyak rombel)
`id, guruId fk, mapelId fk, rombelId fk, tahunAjaranId fk`
Unique: `(guruId, mapelId, rombelId, tahunAjaranId)`.
→ Ini yang dipakai validasi absensi: guru hanya bisa absen pasangan yang ada di sini.

### jadwal
`id, rombelId fk, mapelId fk, guruId fk, hari smallint 1-6, jamMulai time, jamSelesai time, tahunAjaranId fk, semesterId fk`
Index: `(rombelId, hari)`, `(guruId, hari)`. Cek bentrok di service (lihat `docs/03`).

### absensi (siswa, per mapel per tanggal)
`id, siswaId fk, rombelId fk, mapelId fk, jadwalId nullable, tanggal date, jamKe smallint nullable, status (HADIR/IZIN/SAKIT/ALPA), keterangan, dicatatOleh fk guru, createdAt, updatedAt`
Unique: `(siswaId, mapelId, tanggal, jamKe)` — cegah dobel input.
Index: `(rombelId, tanggal)`, `(siswaId, tanggal)`.

### absensi_guru (face)
`id, guruId fk, tanggal date, jamMasuk timestamptz, jamPulang nullable, metodeMasuk (FACE/MANUAL_FALLBACK), statusVerifikasi, skorKemiripan float nullable, lokasiLat/lng nullable, deviceInfo jsonb`
Unique: `(guruId, tanggal)`.

### face_enrollment
`id, guruId fk unique, embedding bytea (terenkripsi), versiModel text, consentAt timestamptz, consentFileUrl, aktif bool`

### nilai
`id, siswaId fk, mapelId fk, rombelId fk, semesterId fk, jenis (TUGAS/HARIAN/UTS/UAS/SUMATIF), nilai numeric(5,2), deskripsi, dinilaiOleh fk`
Index: `(siswaId, semesterId, mapelId)`.

### perizinan
`id, siswaId fk, tanggalMulai date, tanggalSelesai date, jenis (IZIN/SAKIT), alasan, lampiranUrl nullable, status (DIAJUKAN/DISETUJUI/DITOLAK), diprosesOleh nullable, catatan`

### pelanggaran (BK)
`id, siswaId fk, tanggal, kategori, poin int, keterangan, dilaporkanOleh fk, konselingCatatan nullable (akses terbatas)`

### pengumuman + target
`pengumuman(id, judul, isi, authorId,pinned bool, createdAt)`, `pengumuman_target(id, pengumumanId, targetTipe (SEMUA/TINGKAT/ROMBEL), targetId nullable)`

### users, devices, audit_logs
`users(id, username unique, passwordHash, role (ADMIN/KEPALA_SEKOLAH/GURU/WALI_KELAS/BK/SISWA/ORTU), guruId/siswaId/orangTuaId nullable, aktif)`
`devices(id, userId, fcmToken unique, platform, model, appVersion, terakhirAktif)`
`audit_logs(id, aktorId, aksi, entitas, entitasId, sebelum jsonb, sesudah jsonb, createdAt)` — append only, tidak ada update/delete.

## 4. Seed Awal

- `tingkat`: 7, 8, 9.
- `tahunAjaran`: 2026/2027 Ganjil aktif.
- `rombel`: 7A-7H, 8A-8G, 9A-9G (22 baris) + wali kelas dummy null.
- `mapel`: Informatika, MTK, IPA, IPS, B.Indo, B.Inggris, PPKn, Agama, PJOK, Seni, Prakarya (Kurikulum Merdeka).
- `users`: admin default (ganti password saat deploy).

Script: `services/api-server/prisma/seed.ts` + `scripts/import-siswa-excel.ts`.

## 5. Migrasi

- Tool: Prisma Migrate. File di `services/api-server/prisma/migrations/`.
- Aturan: tiap ubah schema → `npx prisma migrate dev --name <jelas>` + update dokumen ini. Tidak ada `synchronize: true`.
- Data sensitif (NISN/NIP/embedding) tidak boleh masuk seed yang di-commit.
