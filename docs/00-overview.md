# 00 — Overview Produk

## Masalah
Administrasi SMP Negeri (±1000 siswa, ±22 rombel) masih manual: absensi kertas, nilai tersebar di Excel guru, izin via WA, rekap TU lambat.

## Solusi (MVP)
- **Web Dashboard** untuk TU/Admin + Kepala Sekolah: master data, jadwal, rekap, laporan.
- **Mobile Guru** untuk Guru/Wali Kelas: presensi wajah, absensi siswa, nilai, jadwal.
- **Backend tunggal + DB tunggal**: semua device bicara ke satu API.

Tanpa modul SPP (sekolah negeri). Tanpa PPDB/payroll di MVP.

## Pengguna & Platform

| Role | Platform MVP | Yang dilakukan |
|---|---|---|
| SUPER_ADMIN (TU/Operator) | Web | Semua master, jadwal, user, approval fallback, export |
| KEPALA_SEKOLAH | Web + Mobile Guru (mode kepsek) | Dashboard, rekap, approval surat |
| GURU_MAPEL | Web + Mobile | Absensi mapelnya, nilai mapelnya, jadwalnya |
| WALI_KELAS | Web + Mobile | + kelola kelas binaan, approval izin, rekap kelas |
| GURU_BK | Web + Mobile | Kasus/pelanggaran (akses terbatas) |
| SISWA, ORANG_TUA | — (Fase 2) | Datanya dikelola admin/guru dulu |

## Scope MVP vs Nanti

**MVP wajib jalan end-to-end:**
1. Login + RBAC semua role guru/admin.
2. Master: tahun ajaran, tingkat, rombel (fleksibel!), siswa, guru, mapel, jadwal (deteksi bentrok).
3. Absensi siswa manual per mapel (mapel auto-detect dari akun guru).
4. Presensi guru via wajah (masuk/pulang) + rekap keterlambatan.
5. Nilai + rapor PDF + rekap dashboard + export Excel/PDF.

**Fase 2:** app Siswa & Ortu, tugas/PR, BK penuh, ekskul, chat guru-ortu, kenaikan kelas otomatis massal.
**Fase 3:** CBT/bank soal, analitik lanjut, Dapodik, surat otomatis.

## Data Kunci yang Fleksibel
- `Tingkat` (7/8/9, bisa nambah). `Rombel` = `Tingkat` + `TahunAjaran` + nama (`7A`...). Admin bisa tambah `7I` atau arsipkan `9G` tanpa ubah kode.
- `Jadwal` = `Rombel` + `Mapel` + `Guru` + hari/jam. Satu guru bisa banyak rombel, satu rombel banyak mapel.
- `Absensi` = `Siswa` + tanggal + `Mapel` + jam + status (HADIR/IZIN/SAKIT/ALPA).
- `AbsensiGuru` = `Guru` + tanggal + jam_masuk/pulang + metode (FACE/MANUAL_FALLBACK).

## Metrik Sukses
- 90% guru pakai absensi digital dalam 1 bulan.
- Rekap TU < 1 hari (dari mingguan).
- Nol rombel hard-code di kode.
