# 08 — Auth, RBAC & Multi-Device Session

## Model Login (sama untuk web & mobile)

```
[Web/Mobile] POST /auth/login {email, password}
      → Backend cek bcrypt + role aktif?
      → buat access JWT (15 mnt, berisi sub, role, guru_id)
      → buat refresh opaque/JWT (7 hari) simpan di tabel sesi + kirim httpOnly cookie (web) / secure storage (mobile)
      → catat device { user_id, fcm_token, platform, last_login }
```

- Access pendek (15 mnt) agar jika dicuri cepat mati. Refresh panjang tapi bisa dicabut per device dari server.
- Ganti password / nonaktifkan user → semua refresh dicabut → semua device logout.

## Role & Permission Matrix (acuan Guard)

| Kemampuan | SUPER_ADMIN | KEPALA_SEKOLAH | GURU_MAPEL | WALI_KELAS | GURU_BK |
|---|---|---|---|---|---|
| Kelola tahun/tingkat/rombel | ✅ | baca | baca | baca | baca |
| Kelola siswa/guru/mapel | ✅ | baca | baca terbatas* | baca kelas binaan | baca terbatas |
| Kelola jadwal | ✅ | baca | baca jadwalnya | baca kelasnya | baca |
| Input absensi siswa | ✅ | — | ✅ mapelnya | ✅ kelas binaannya | — |
| Edit absensi hari-H | ✅ | — | ✅ buatannya | ✅ kelasnya | — |
| Input nilai | ✅ | — | ✅ mapelnya | baca kelasnya | — |
| Presensi wajah (masuk/pulang) | — | ✅ | ✅ | ✅ | ✅ |
| Verifikasi fallback wajah | ✅ | — | — | — | — |
| Putuskan izin | ✅ | — | — | ✅ kelasnya | — |
| Catat pelanggaran | ✅ | baca | — | ✅ kelasnya | ✅ |
| Pengumuman | ✅ tulis | baca | baca | baca | baca |
| Dashboard ringkasan | ✅ | ✅ | — | rekap kelasnya | — |
| Export | ✅ | ✅ | — | kelasnya | — |

`* terbatas` = hanya siswa/rombel yang diajar (filter di service via JWT, bukan di client).

Implementasi: `@Roles('WALI_KELAS')` + di service cek `rombel.wali_kelas_id == jwt.guru_id`. UI menyembunyikan tombol, **backend yang menolak**.

## Multi-Device Rules

1. Satu user boleh login di HP + laptop bersamaan. Tiap device punya `refresh` + `fcm_token` sendiri di tabel `sesi_perangkat`.
2. Ganti HP / logout 1 device → hapus baris device itu saja, device lain tetap login.
3. FCM token diupdate tiap login + tiap app start (`PUT /devices/token`). Token usang dibersihkan saat push gagal.
4. Jam sensitif (presensi, absensi): pakai jam server (UTC), tampil WIB di UI. Jangan percaya jam HP untuk validasi keterlambatan — simpan `jam_server` + `jam_client` untuk audit.

## Token & Keamanan Praktis

- Access: JWT HS256, `exp 15m`, payload minimal `{ sub, role, guru_id? }`. Jangan taruh NISN/foto/embedding di token.
- Refresh: simpan hash di DB (`sesi`), rotasi tiap dipakai (refresh baru, lama hangus) untuk cegah replay.
- Rate limit: login 5x/menit/IP, presensi 10x/menit/user. Lockout 15 mnt setelah 5 gagal.
- Password: bcrypt 12, min 8 char + angka. Reset via token sekali pakai 1 jam (kirim ke email TU di MVP).
- Web: refresh di `httpOnly; Secure; SameSite=Lax` cookie. Mobile: di `flutter_secure_storage`, jangan di SharedPreferences biasa.

## Contoh Guard NestJS

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GURU_MAPEL','WALI_KELAS')
@Post('absensi/bulk')
createBulk(@CurrentUser() u: JwtPayload, @Body() dto: AbsensiBulkDto) {
  return this.absensi.createBulk(u, dto); // service cek guru_mapel + jadwal
}
```

## Checklist Uji RBAC (wajib sebelum rilis)
- [ ] Guru A tidak bisa absen mapel Guru B (harus 403).
- [ ] Wali 7A tidak bisa putuskan izin siswa 8B (403).
- [ ] Kepsek bisa baca rekap tapi tidak bisa input nilai (403).
- [ ] Token mati (15 mnt) otomatis refresh tanpa logout paksa.
- [ ] Logout 1 device tidak mengeluarkan device lain.
