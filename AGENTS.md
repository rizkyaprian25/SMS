# AGENTS.md — Aturan Wajib AI Agent & Developer SMS

> File ini dibaca pertama kali sebelum mengerjakan apapun di repo ini.
> Prioritas: `PRD_SMS_SMP.md` > `docs/*` > `AGENTS.md` > instruksi chat.
> Jika ada konflik, tanyakan ke user, jangan asal pilih.

## 1. Konteks Proyek

- SMP Negeri, ±1000 siswa, ±22 rombel (7A-7H, 8A-8G, 9A-9G sebagai **seed**, bukan konstanta).
- MVP = `apps/mobile-guru` (Flutter) + `apps/web-dashboard` (Next.js) + `services/api-server` (NestJS + Prisma + PostgreSQL).
- Fase 2 (`apps/mobile-siswa-ortu`) hanya desain (`docs/06`), jangan scaffold full app tanpa perintah.
- Bahasa: Indonesia untuk UI, komentar, dan dokumen. Kode (variabel/fungsi) Inggris.

## 2. Struktur Wajib Dipatuhi

```
apps/mobile-guru      → Flutter + Riverpod (AsyncNotifier), go_router, Dio, Hive (antre offline absensi)
apps/web-dashboard    → Next.js App Router + TypeScript + TanStack Query + react-hook-form + zod
services/api-server   → NestJS modular per domain (controller tipis + service + dto), Prisma
packages/shared-types → Enum + DTO bersama (single source of truth tipe)
packages/api-client   → hasil generate OpenAPI, jangan edit manual
```

- Frontend **dilarang** query DB langsung. Semua via `services/api-server` (`/api/v1`).
- `apps/*` dilarang import langsung satu sama lain. Komunikasi via `packages/shared-types` + API saat runtime.
- Jangan hardcode daftar rombel/tingkat/semester/mapel di kode. Selalu fetch dari API.
- `Rombel` selalu berpasangan dengan `tahunAjaranId`. Histori tidak boleh kehapus saat naik kelas.

## 3. Workflow Wajib

1. Baca `docs/README.md` + dokumen relevan sebelum code (misal absensi → `docs/02`, `docs/03`, `docs/05`, `docs/07`, `docs/08`).
2. Load skill yang cocok sebelum coding (`sms-backend-model` / `sms-data-model` / `sms-web-model` / `sms-flutter-model` di `.opencode/skills/`, ringkasan di `docs/12-standar-kode.md`) dan tiru modul contoh (`services/api-server/src/rombel/`, `apps/web-dashboard/src/hooks/use-rombel.ts`, `apps/mobile-guru/lib/features/rombel/`).
3. Buat/edit via TodoWrite bila tugas ≥3 langkah. Satu `in_progress` dalam satu waktu.
4. Kontrak dulu: tambah/ubah endpoint → update `docs/07-api-contract.md` + `packages/shared-types`, regenerate `packages/api-client`.
5. Migrasi DB: tiap ubah skema → `npx prisma migrate dev --name <jelas>` + update `docs/02-database-design.md`. Tidak ada `sync: true` di production.
6. Verifikasi: `npm run lint`, `npm test` / `npm run build` (backend/web) / `flutter analyze`, `flutter test` (mobile). Tulis hasil verifikasi di jawaban akhir.
7. Jangan commit/push kecuali diminta eksplisit.

## 4. Konvensi Kode

### Umum
- REST: `/api/v1/...` sesuai `docs/07`. Format list `{ data, meta }`, error via filter Nest standar.
- Auth: Bearer JWT access (15 mnt) + refresh (7 hari, rotasi). Device dicatat untuk FCM. Detail `docs/08-auth-rbac-multidevice.md`.
- Tanggal: ISO 8601 UTC di API, tampil WIB (`dd MMM yyyy HH:mm`) di UI. Jam sensitif pakai jam server.
- Validasi di backend dengan class-validator, jangan percaya frontend.

### NestJS (`services/api-server`)
- Satu fitur = satu module. Tidak ada query Prisma di controller. Detail `docs/03-backend-server-design.md`.
- RBAC via Guard + `@Roles(...)` + cek penugasan di service (guru hanya mapel×rombel yang diampu).
- Audit log untuk: absensi edit di hari sama, kenaikan kelas, BK/pelanggaran, face fallback manual.

### Next.js (`apps/web-dashboard`)
- Fetch via `packages/api-client` + TanStack Query, key selalu bawa `tahunAjaranId` (misal `['siswa', tahunAjaranId, rombelId, q, page]`).
- Form: react-hook-form + zodResolver, schema dari `packages/shared-types` bila memungkinkan.
- Tabel besar (1000 siswa): pagination server-side, search debounce 300ms. Detail `docs/04-web-dashboard-design.md`.

### Flutter (`apps/mobile-guru`)
- State: **Riverpod** (AsyncNotifier). Jangan campur Bloc/GetX.
- Offline-first khusus absensi: antre Hive + badge "Belum tersinkron", retry saat online (detail `docs/10-notification-offline-sync.md`).
- Kamera/face isolasi di `features/presensi` (detail `docs/09-face-recognition-design.md`).

## 5. Keamanan & Privasi (Wajib)

- NIP/NISN/foto/face embedding = data sensitif. Jangan log, jangan return berlebih di API list.
- Face embedding terenkripsi (AES-256-GCM) + consent tertulis guru (UU PDP). Detail `docs/09`.
- Upload: validasi MIME + max size (foto 2MB, lampiran 5MB), simpan ke S3/MinIO bukan di DB.
- Rate limit login & presensi. Lockout brute force.

## 6. Larangan

- ❌ Hardcode `7A..9G`, `semester`, `mapel` di kode/UI.
- ❌ Bikin app `siswa/ortu` fungsional di MVP.
- ❌ Tambah dependency auth/state baru tanpa diskusi (cukup yang sudah ditetapkan).
- ❌ Hapus/rename kolom DB tanpa migrasi.
- ❌ Tulis dokumentasi Inggris campur — dokumen `.md` harus Indonesia (istilah teknis boleh Inggris).
- ❌ Buat file `.md` baru di root selain yang sudah ada tanpa izin (taro di `docs/`).

## 7. Cara Menjawab User

- Singkat, faktual, Bahasa Indonesia santai tapi profesional. Tanpa superlatif.
- Referensi file sebagai `path:line` bila menyebut kode.
- Setelah selesai: ringkas file yang dibuat/diubah + cara verifikasi + hal yang belum/tunda (misal Fase 2).
- Jika butuh keputusan (misal Redis/BullMQ vs cron sederhana, ML Kit vs model lain), tanyakan via tool question dengan rekomendasi, jangan diam-diam memilih yang berat/biaya tinggi.

## 8. Checklist Definition of Done (tiap fitur)

- [ ] Kontrak di `docs/07` + `packages/shared-types` update
- [ ] Migrasi + `docs/02` update bila ubah DB
- [ ] RBAC + validasi backend (+ checklist uji `docs/08`)
- [ ] UI loading/empty/error state
- [ ] `lint` + `test`/`build` lolos
- [ ] Audit log bila fitur sensitif
