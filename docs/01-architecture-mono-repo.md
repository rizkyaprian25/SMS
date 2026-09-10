# 01 — Arsitektur Mono-Repo & Multi-Device (Wajib untuk Pemula)

Dok ini menjawab: "Saya baru pertama kali bikin multi-device (web + mobile). Bagaimana cara berpikirnya?"

## Jawaban Singkat
**Jangan bikin 3 aplikasi terpisah dengan DB masing-masing. Bikin 1 backend + 1 database, lalu web & mobile hanyalah 'tampilan' berbeda yang memanggil API yang sama.**

```
                    ┌──────────────────┐
                    │  Web Dashboard   │
                    │  Next.js (Admin) │
                    └───────┬──────────┘
                            │ HTTPS /api/v1 + JWT
┌──────────────┐    ┌───────▼──────────┐    ┌──────────────┐
│ Mobile Guru  │───▶│  Backend Tunggal │───▶│  PostgreSQL  │
│ Flutter      │    │  NestJS + Prisma │    │  (1 database)│
└──────────────┘    └───────┬──────────┘    └──────────────┘
                            │
                    ┌───────▼──────────┐    ┌──────────────┐
                    │ FCM / Storage    │    │ Mobile S/O   │
                    │ (notif + file)   │    │ (Fase 2)     │
                    └──────────────────┘    └──────────────┘
```

## Kenapa Mono-Repo (satu repo untuk semua)?

| Alternatif | Masalah |
|---|---|
| 3 repo terpisah (web, mobile, backend) | Kontrak API gampang beda versi, susah lacak perubahan DB+API+UI dalam 1 fitur |
| Monolit campur (backend+web satu folder) | Mobile susah generate client, deploy tercampur |
| **Mono-repo (dipilih)** | 1 PR bisa berisi: migrasi DB + endpoint + UI web + UI mobile. Versioning jelas. Cocok tim kecil 1-3 orang. |

Aturan mono-repo ini:
- `apps/*` tidak boleh import langsung satu sama lain. Komunikasi hanya via `packages/shared-types` (tipe) dan via API saat runtime.
- `services/api-server` tidak boleh tahu tampilan client. Dia hanya terima JSON, kembalikan JSON.
- `packages/api-client` di-generate dari OpenAPI, jadi web & mobile selalu sinkron.

## Struktur Folder Dijelaskan (untuk pemula)

```
apps/web-dashboard/      → Next.js. Di-deploy ke Vercel/VPS. Hanya HTML+JS. Tidak simpan data.
apps/mobile-guru/        → Flutter. Di-install di HP guru. Data cache kecil (Hive) hanya untuk antre offline.
apps/mobile-siswa-ortu/  → Kosong dulu (Fase 2). Sekarang cuma README + desain di docs/06.
services/api-server/     → NestJS. Satu-satunya yang boleh query PostgreSQL. Di-deploy ke VPS (Docker).
packages/shared-types/   → Enum + DTO TypeScript: StatusKehadiran, Role, dsb. Import oleh backend & web. Untuk Dart, generate via openapi.
packages/api-client/     → Hasil generate openapi-generator. Web pakai TS-axios, mobile pakai Dart-dio.
infra/docker/            → docker-compose.yml: postgres:16 + minio (S3 lokal) + (opsional) redis untuk antrean.
docs/                    → Desain. Wajib dibaca sebelum coding.
```

## Alur Request (contoh: guru absen kelas 7A)

1. Guru buka Mobile → login (`POST /api/v1/auth/login`) → dapat `accessToken` (15 mnt) + `refreshToken` (httpOnly/aman di mobile storage).
2. App panggil `GET /api/v1/jadwal-saya?hari=SENIN` → backend cek JWT + role GURU → kembalikan jadwal guru itu saja.
3. Guru pilih kelas 7A → app panggil `GET /api/v1/rombel/:id/siswa` + `GET /api/v1/absensi?rombelId=&tanggal=&mapelId=`.
4. Guru tap Hadir/Alpa → app `POST /api/v1/absensi/bulk` (satu request untuk 30 siswa, bukan 30 request).
5. Backend validasi: guru ini memang ngajar mapel itu di rombel itu? tanggal valid? → simpan → kirim FCM ke ortu (Fase 2) / catat notifikasi.
6. Web TU otomatis lihat data yang sama di `GET /api/v1/absensi/rekap` — tanpa sync manual.

**Kunci:** langkah 5 validasinya di server. Kalau validasi cuma di HP, guru bisa tembak API manual dan isi kelas orang lain.

## Environment & Deploy (gambaran)

| Env | DB | Backend | Web | Mobile |
|---|---|---|---|---|
| Lokal | Docker postgres + minio | `npm run start:dev` (:3001) | `npm run dev` (:3000) | `flutter run --dart-define=API_URL=http://10.0.2.2:3001` |
| Staging | Neon/Supabase PG + S3 | Docker di VPS | Vercel preview | APK internal |
| Produksi | Managed PG + S3 + backup harian | Docker + Caddy/Nginx TLS | Vercel/VPS | Play Store + App Store |

Satu `.env.example` per app. Secret tidak pernah di-commit.

## Keputusan yang Sengaja Dibuat (agar tidak debat ulang)

1. **NestJS + Prisma + PostgreSQL** (bukan Laravel/TypeORM): modul rapi per domain, migrasi aman untuk histori rombel, cocok TS full-stack dengan Next.js.
2. **Next.js bukan Flutter Web** untuk dashboard: tabel 1000 siswa + export + scheduler drag-drop lebih matang di React.
3. **Riverpod bukan Bloc/GetX** untuk Flutter: cukup untuk CRUD + offline antre, learning curve rendah untuk tim baru.
4. **REST bukan GraphQL** di MVP: lebih mudah untuk RBAC per endpoint, generate client Dart, dan caching sederhana.

## Kesalahan Pemula yang Harus Dihindari

- ❌ Bikin tabel `absensi` terpisah untuk web vs mobile. → ✅ Satu tabel `absensi`, beda `created_by` + `source` (WEB/MOBILE).
- ❌ Simpan `nama_kelas: "7A"` sebagai string di tiap tabel. → ✅ Selalu FK `rombel_id` (+ join ke `tahun_ajaran`).
- ❌ Cek role cuma di UI (`if role==admin show button`). → ✅ Cek di Guard backend juga. UI hanya untuk UX.
- ❌ Upload foto ke folder backend. → ✅ Upload ke S3/MinIO, DB cuma simpan URL.
