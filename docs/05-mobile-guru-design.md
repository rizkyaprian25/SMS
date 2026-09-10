# 05 — Desain Mobile Guru (Flutter + Riverpod)

> Untuk: Guru Mapel, Wali Kelas, Guru BK, Kepala Sekolah (mode baca + approval). Bukan untuk siswa/ortu (Fase 2).

## Struktur Fitur

```
apps/mobile-guru/lib/
├── main.dart + app.dart + router.dart (go_router, guard login)
├── core/{api/dio_client.dart, auth/auth_provider.dart, storage/secure.dart, tanggal.dart, notif/fcm.dart}
└── features/
    ├── auth/            # login, simpan token, daftar fcm token
    ├── presensi/        # face masuk/pulang + fallback
    ├── jadwal/          # jadwal saya hari ini/minggu ini
    ├── absensi/         # absensi siswa manual (inti MVP)
    ├── nilai/           # input nilai cepat per kelas+mapel
    ├── kelas/           # (wali) daftar siswa binaan + rekap
    ├── pengumuman/      # list + detail + badge belum dibaca
    └── profil/          # profil guru, ganti password, logout, hapus wajah
```

State: Riverpod `AsyncNotifier` per fitur. Navigasi: `go_router` dengan redirect ke `/login` jika tidak ada token.

## Screen & Flow Inti

### 1. Login
- `email + password` → `POST /auth/login` → simpan `access` di memori + `refresh` di secure storage → `PUT /devices/token` (fcm) → `GET /auth/me` → arahkan ke home sesuai role.
- Gagal 5x → tampilkan hitung mundur lockout.

### 2. Home (beda per role, 1 codebase)
- Guru Mapel: kartu "Jadwal Hari Ini (3 kelas)" + tombol "Absen Sekarang" + "Presensi Masuk/Pulang".
- Wali Kelas: + kartu "Kelas Binaan 7A: 30 siswa, 2 alpa hari ini" + tombol "Approval Izin (2)".
- Kepsek: + ringkasan sekolah (baca dari `/dashboard/ringkasan`).

### 3. Presensi Wajah (face)
- Tombol Masuk/Pulang → kamera depan → overlay wajah → cek liveness (kedip/gerak) on-device → hitung embedding → bandingkan dengan template (lihat `docs/09`) → kirim `{ face_score, liveness:true, lat, lng }` ke `POST /absensi-guru/masuk|pulang`.
- Sukses → tampil jam server + status tepat/terlambat. Gagal 3x → tombol "Presensi Manual" → form alasan + foto → `POST /absensi-guru/fallback` (PENDING).
- Geofence: jika di luar radius sekolah → warning "Di luar area sekolah, tetap lanjut?" + flag `di_luar_area=true` untuk admin.

### 4. Absensi Siswa (layar paling sering dipakai — harus cepat & bisa offline)
```
Jadwal Hari Ini → pilih kelas (mis. 7A, jam ke-3 Informatika)
  → daftar 32 siswa (nama + avatar + status kemarin)
  → mapel otomatis "Informatika" dari akun (jangan suruh pilih manual!)
  → tombol "Tandai Semua Hadir" → tap yang Izin/Sakit/Alpa
  → Simpan (1 request bulk)
```
- Daftar dimuat dari `GET /rombel/:id/siswa?tanggal=` (include absensi hari itu agar tidak dobel).
- Simpan: `POST /absensi/bulk`. Sukses → snackbar + kembali. Gagal jaringan → simpan ke antre Hive (`kotak_absensi_tertunda`) + badge merah "Belum tersinkron (1)" → retry otomatis saat online (lihat `docs/10`).
- Edit hari yang sama: geser/status ulang → `PATCH /absensi/:id` (audit).

### 5. Nilai Cepat
- Pilih mapel (dari yang diampu) + rombel + jenis (Harian/Tugas/UTS/UAS) → grid nama + field angka 0-100 → validasi range → `POST /nilai/bulk`.
- Tampilkan rata-rata kelas live di atas grid sebagai bantuan.

### 6. Pengumuman + Profil
- List pengumuman filter target role/rombel. Badge push via FCM.
- Profil: foto, NIP, mapel diampu, kelas binaan, tombol hapus data wajah (UU PDP) + logout per device.

## Offline & Performa (MVP)
- Hanya absensi yang antre offline. Nilai/jadwal/pengumuman butuh online (tampilkan pesan jelas, bukan spinner abadi).
- Cache jadwal hari ini 24 jam (drift/hive). Daftar siswa 1 rombel di-cache per tanggal.
- List 30+ siswa: `ListView.builder`, search lokal, tanpa gambar besar (thumbnail 128px).

## Izin Perangkat (Android 8+, iOS 13+)
Kamera (wajib), lokasi saat presensi (wajib, bisa "hanya saat pakai"), notifikasi (opsional tapi disarankan), penyimpanan foto tugas (Fase 2).

## DoD Mobile
- [ ] Absensi 32 siswa tersimpan dalam 1 request < 3 detik di 4G.
- [ ] Badge "Belum tersinkron" + retry jalan saat offline→online.
- [ ] Tidak ada mapel/rombel hard-code. Semua dari API.
- [ ] `flutter analyze && flutter test` lolos.
