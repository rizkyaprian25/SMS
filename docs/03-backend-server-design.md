# 03 — Desain Server / Backend (NestJS + Prisma)

> Satu-satunya yang boleh akses DB. Web & mobile hanya via REST ini.

## Struktur Modul

```
services/api-server/src/
├── main.ts                 # bootstrap, validation pipe global, prefix /api/v1
├── app.module.ts
├── common/                 # guard, decorator, filter, interceptor, pagination, storage
│   ├── decorators/roles.decorator.ts
│   ├── guards/jwt-auth.guard.ts + roles.guard.ts
│   ├── filters/http-exception.filter.ts
│   └── pagination.ts
├── auth/                   # login, refresh, logout, device (FCM token)
├── users/                  # pengguna (admin kelola akun)
├── tahun-ajaran/ tingkat/ rombel/ siswa/ guru/ mapel/ jadwal/
├── absensi/                # absensi siswa (bulk + rekap)
├── absensi-guru/           # presensi wajah + fallback + rekap keterlambatan
├── nilai/ rapor/           # nilai + generate rapor PDF
├── perizinan/ pengumuman/ pelanggaran/ notifications/ reports/ storage/
└── prisma/                 # PrismaService
prisma/{schema.prisma, migrations/, seed.ts}
openapi.yaml                # dihasilkan otomatis, jangan edit manual
```

Satu domain = satu folder berisi `*.controller.ts + *.service.ts + dto/*.ts`. **Dilarang query Prisma di controller.** Semua logika di service.

## Contoh Alur Kode (absensi bulk)

```
Mobile POST /api/v1/absensi/bulk
  → JwtAuthGuard (token valid?) → RolesGuard (@Roles(GURU_MAPEL,WALI_KELAS))
  → AbsensiController.createBulk(dto)
  → AbsensiService:
      1. cek guru_id dari JWT mengampu mapel_id? (via guru_mapel)
      2. cek jadwal: rombel+mapel+guru cocok hari ini? (boleh override dengan alasan)
      3. upsert per (siswa_id,tanggal,mapel_id,jam_ke) dalam transaction
      4. tulis audit_log jika edit hari yang sama
      5. enqueue notifikasi untuk yang IZIN/SAKIT/ALPA
  → { data: { tersimpan: 32 } }
```

## Validasi & Error
- Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`. DTO pakai `class-validator` (`@IsUUID(), @IsEnum(), @IsDateString()`).
- Pagination: `GET /siswa?rombelId=&q=&page=1&limit=30` → `{ data: [...], meta: { total, page, limit, totalPages } }`.
- Error: Nest `HttpException` → filter seragamkan `{ statusCode, message, error, path }`.
- Upload: `FileInterceptor` + cek `mimetype + size` di server. Simpan via `StorageService` ke MinIO/S3. DB simpan `file_url`.

## Aturan Bisnis Penting (jangan taruh di client)

1. **Absensi:** guru hanya bisa input mapel yang diampu (`guru_mapel`) + rombel yang dijadwalkan. Override luar jadwal wajib isi `alasan_override` → tercatat di audit.
2. **Jadwal bentrok:** sebelum insert/update jadwal, query overlapping `(guru_id, hari, range jam)` dan `(rombel_id, hari, range jam)`. Tolak dengan `409 + detail bentrok`.
3. **Kenaikan kelas:** endpoint `POST /rombel/naik-kelas` terima `{ dari_tahun_id, ke_tahun_id, mapping: [{siswa_id, rombel_baru_id}] }`. Wajib `preview=true` dulu → kembalikan ringkasan → user konfirmasi → eksekusi transaction + tulis `riwayat_kelas` per siswa.
4. **Presensi guru:** `POST /absensi-guru/masuk` verifikasi `face_score >= 0.6 + liveness=true + radius geofence`. Gagal 3x → izinkan `MANUAL_FALLBACK` dengan `status_verifikasi=PENDING`.
5. **Nilai:** 0-100, 2 desimal. Hanya guru pengampu mapel / wali kelas (untuk rekap) / admin.

## Laporan & Export
- Rekap pakai query agregasi Prisma (`groupBy tanggal+status`) + pagination server-side. Jangan tarik 1000 baris ke client lalu hitung di browser.
- Export Excel: `GET /reports/absensi.xlsx?...` generate di server (exceljs) → presigned URL / stream. PDF rapor: `GET /rapor/:siswaId.pdf` (puppeteer/pdf-lib).

## Config & Secret
- `.env`: `DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, S3_ENDPOINT/KEY/SECRET/BUCKET, FCM_KEY, GEOFENCE_LAT/LNG/RADIUS_M, FACE_MIN_SCORE`.
- Sediakan `.env.example` tanpa nilai asli. Validasi env saat boot (`zod`/`joi`), gagal boot kalau kurang — jangan jalan setengah.

## Testing Minimal per Modul
- `*.service.spec.ts` (logika bentrok, validasi role) + 1 e2e `POST bulk absensi` (happy path + ditolak beda mapel). Perintah: `npm run test`.
