# 07 — Kontrak API (REST `/api/v1`)

> Single source of truth untuk web & mobile. Kalau endpoint tidak ada di sini, client dilarang memakainya.

## Format Umum

- Base: `{API_URL}/api/v1`. Auth: `Authorization: Bearer <accessToken>`.
- List: `GET /x?page=1&limit=30&q=&sort=nama:asc` → `{ data: [], meta: { total, page, limit, totalPages } }`.
- Detail: `GET /x/:id` → `{ data: {...} }`.
- Create: `POST /x` → `201 { data: {...} }`. Bulk: `POST /x/bulk`.
- Error: `{ statusCode, message, error, path }`. `401` token mati → client pakai refresh. `403` role tidak boleh. `409` bentrok/duplikat. `422` validasi.

## Auth & User

| Method & Path | Role | Body / Query | Keterangan |
|---|---|---|---|
| `POST /auth/login` | publik | `{ email, password, deviceToken? }` | return `{ accessToken, user }` + set refresh cookie |
| `POST /auth/refresh` | cookie | — | putar access baru |
| `POST /auth/logout` | login | — | hapus refresh + device |
| `GET /auth/me` | login | — | profil + role + mapel diampu + rombel binaan |
| `PUT /devices/token` | login | `{ fcmToken, platform }` | daftar device untuk push |

## Master Data

| Method & Path | Role | Keterangan |
|---|---|---|
| `GET/POST /tahun-ajaran` | ADMIN baca semua, tulis ADMIN | `PUT /:id/aktifkan` untuk ganti tahun aktif |
| `GET/POST /tingkat` | ADMIN | seed 7/8/9 |
| `GET /rombel?tahunAjaranId=&tingkatId=` | semua guru | list fleksibel, jangan hard-code |
| `POST /rombel` | ADMIN | `{ tingkat_id, tahun_ajaran_id, nama, wali_kelas_id?, kapasitas }` |
| `PATCH /rombel/:id` | ADMIN | rename/ganti wali/kapasitas |
| `POST /rombel/:id/arsip` | ADMIN | soft-delete |
| `GET /rombel/:id/siswa` | guru terkait + ADMIN | daftar siswa 1 rombel (+ status absensi hari ini via `?tanggal=`) |
| `POST /rombel/naik-kelas?preview=true` | ADMIN | massal, lihat `docs/03` |
| `GET/POST /siswa?q=&rombelId=&page=` | ADMIN, WALI (kelasnya), GURU (yang diajar) | list dibatasi role di service |
| `GET/PATCH /siswa/:id` | sesuai role | biodata + `data_ortu` (mask NISN di list) |
| `POST /siswa/import` (xlsx) | ADMIN | import massal + laporan baris gagal |
| `GET/POST /guru`, `GET/PATCH /guru/:id` | ADMIN, KEPSEK (baca) | termasuk `mapel_diampu[]` |
| `PUT /guru/:id/mapel` | ADMIN | set `{ mapel_ids[] }` (guru_mapel) |
| `GET/POST /mapel` | ADMIN | `{ kode, nama, kelompok }` |
| `GET /jadwal?rombelId=&guruId=&hari=` | login | |
| `POST /jadwal` | ADMIN | tolak 409 jika bentrok (kembalikan detail) |
| `GET /jadwal-saya?hari=` | GURU | jadwal guru login (untuk mobile) |

## Akademik

| Method & Path | Role | Keterangan |
|---|---|---|
| `POST /absensi/bulk` | GURU_MAPEL, WALI_KELAS | `{ tanggal, rombel_id, mapel_id, jam_ke, alasan_override?, items: [{ siswa_id, status, keterangan? }] }` |
| `GET /absensi?rombelId=&mapelId=&tanggal=&status=` | guru terkait, ADMIN, KEPSEK | |
| `GET /absensi/rekap?rombelId=&dari=&sampai=&groupBy=siswa/harian` | WALI, ADMIN, KEPSEK | agregasi server-side |
| `PATCH /absensi/:id` | pencatat hari-H / ADMIN | edit + audit |
| `POST /absensi-guru/masuk` | GURU | `{ face_score, liveness, lat, lng }` → 201 atau fallback |
| `POST /absensi-guru/pulang` | GURU | update baris hari ini |
| `POST /absensi-guru/fallback` | GURU | manual + alasan → PENDING |
| `POST /absensi-guru/:id/verifikasi` | ADMIN | `{ putusan: SETUJU/TOLAK }` |
| `GET /absensi-guru/rekap?dari=&sampai=&guruId=` | ADMIN, KEPSEK | jam masuk/pulang + keterlambatan |
| `POST /nilai/bulk` | GURU pengampu | `{ mapel_id, tahun_ajaran_id, semester, jenis, items: [{ siswa_id, nilai }] }` |
| `GET /nilai?rombelId=&mapelId=&semester=&jenis=` | guru terkait, ADMIN | |
| `GET /rapor/:siswaId.pdf?semester=` | WALI, ADMIN | generate PDF |

## Kesiswaan & Komunikasi (MVP sebagian, penuh Fase 2)

| Method & Path | Role | Keterangan |
|---|---|---|
| `GET/POST /perizinan` | guru/wali (mewakili, MVP) | Fase 2: ORANG_TUA langsung |
| `POST /perizinan/:id/putuskan` | WALI_KELAS, ADMIN | `{ putusan, catatan? }` → auto-update absensi |
| `GET/POST /pengumuman?target=` | ADMIN tulis, semua baca sesuai target | |
| `GET/POST /pelanggaran` | GURU_BK, WALI_KELAS | akses dibatasi BK + wali ybs |
| `GET /dashboard/ringkasan` | ADMIN, KEPSEK | `{ total_siswa, total_guru, total_rombel, hadir_hari_ini, alpa_hari_ini }` |
| `GET /reports/absensi.xlsx?...` | ADMIN, KEPSEK, WALI | export server-side |

## Contoh Payload

```json
POST /api/v1/absensi/bulk
{
  "tanggal": "2026-09-10",
  "rombel_id": "uuid-7a-2026",
  "mapel_id": "uuid-informatika",
  "jam_ke": 3,
  "items": [
    { "siswa_id": "uuid-1", "status": "HADIR" },
    { "siswa_id": "uuid-2", "status": "SAKIT", "keterangan": "surat dokter" },
    { "siswa_id": "uuid-3", "status": "ALPA" }
  ]
}
→ 201 { "data": { "tersimpan": 32, "tanggal": "2026-09-10" } }
```

## Aturan Versi
- Tambah field opsional = minor, tetap `/v1`. Hapus/ubah wajib = `/v2`. Jangan ubah respons diam-diam.
- Setelah ubah endpoint: update file ini + regenerate `packages/api-client` + beri tahu pemilik web & mobile.
