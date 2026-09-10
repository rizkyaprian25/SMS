# 10 — Notifikasi (FCM), Antre Offline & Sinkronisasi

## 1. Push Notification (Firebase Cloud Messaging)

- Tiap login + tiap app start, mobile kirim FCM token: `PUT /devices/token { fcmToken, platform }`.
- Tabel `sesi_perangkat`/`devices`: satu user boleh banyak device (HP + laptop). Logout 1 device hapus baris itu saja.
- API **tidak kirim FCM langsung** — lempar job ke antrean (Redis/BullMQ bila ada, atau cron sederhana di MVP) agar request absensi tetap cepat. Token usang dibersihkan saat push gagal.
- Template Bahasa Indonesia:
  - Siswa Alpa/Sakit: "Halo Bapak/Ibu, {nama} tercatat {status} pada {mapel} hari ini." (MVP: catat + tampil di web; Fase 2: kirim ke token ortu)
  - Nilai baru, tugas baru, pengumuman penting, izin disetujui/ditolak.

## 2. Antre Offline Absensi (khusus mobile guru)

Hanya absensi yang antre offline. Nilai/jadwal/pengumuman butuh online (tampilkan pesan jelas, bukan spinner abadi).

1. Guru Simpan (offline) → tulis ke Hive `kotak_absensi_tertunda` + badge merah "Belum tersinkron (n)".
2. Online kembali → retry otomatis (3x, backoff) → `POST /absensi/bulk` → sukses → hapus antre + badge.
3. Konflik (data sudah diinput misal via web) → server 409 → HP tampilkan dialog "Data sudah ada, muat ulang?", bukan diam-diam menimpa.
4. Edit hari yang sama → `PATCH /absensi/:id` (audit). Selain hari-H: tombol edit hilang, server tolak 403.

## 3. Aturan Jam

Jam sensitif (presensi, absensi) pakai **jam server (UTC)**. Simpan juga `jam_client` untuk audit. Tampil WIB (`dd MMM yyyy HH:mm`) di UI. Jangan percaya jam HP untuk validasi keterlambatan.
