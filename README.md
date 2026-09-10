# SMS SMP Negeri — Monorepo

Sistem Informasi Sekolah (SMS) untuk SMP Negeri.
Sumber kebenaran produk: `PRD_SMS_SMP.md` (scope MVP vs Fase 2/3).

## Status Scope

**MVP Fase 1 (aktif digarap):**
1. `apps/mobile-guru` — Flutter, untuk Guru / Wali Kelas / Kepala Sekolah
2. `apps/web-dashboard` — Next.js, untuk Admin/TU & Kepala Sekolah
3. `services/api-server` — NestJS REST API, dipakai semua aplikasi

**Fase 2 (placeholder, belum dikerjakan):**
- `apps/mobile-siswa-ortu` — Flutter (siswa + orang tua, multi-anak)

Tanpa modul SPP (sekolah negeri).

## Struktur Monorepo

```
SMS/
├── apps/
│   ├── mobile-guru/        # Flutter MVP guru (absensi manual, nilai, presensi face)
│   ├── web-dashboard/      # Next.js admin (master data, jadwal, rekap, laporan)
│   └── mobile-siswa-ortu/  # Fase 2 placeholder (jangan di-code dulu)
├── services/
│   └── api-server/         # NestJS + Prisma + PostgreSQL, satu-satunya backend
├── packages/
│   ├── shared-types/       # Enum + DTO bersama (single source of truth tipe)
│   └── api-client/         # Client hasil generate OpenAPI (jangan edit manual)
├── infra/
│   └── docker/             # docker-compose (postgres + minio)
├── docs/                   # semua desain MD (index di docs/README.md)
├── .opencode/skills/        # skill agent: sms-backend-model, sms-data-model, sms-web-model, sms-flutter-model
├── scripts/                # seed, backup, import excel (nanti)
├── AGENTS.md               # aturan wajib untuk AI agent + dev
├── README.md               # file ini
└── CHANGELOG.md
```

## Aturan Main

1. **Satu backend, banyak frontend.** Semua aplikasi hanya bicara ke `services/api-server` via REST `/api/v1`. Tidak ada akses langsung ke DB dari frontend.
2. **Kontrak API dulu.** Ubah API → update `docs/07-api-contract.md` + `packages/shared-types` dulu, baru code.
3. **Rombel dinamis.** Jangan hardcode 7A-7H / 8A-8G / 9A-9G. Itu seed data, admin bisa tambah/hapus kapan saja.
4. **MVP dulu.** Jangan kerjakan folder Fase 2 kecuali diminta eksplisit.
5. Baca `AGENTS.md` + `docs/README.md` sebelum coding. Baru pertama kali multi-device? Wajib baca `docs/01-architecture-mono-repo.md`.

## Quick Start (rencana, setelah scaffold)

```powershell
# 1. Infra lokal
docker compose -f infra/docker/docker-compose.yml up -d  # postgres + minio

# 2. Backend
cd services/api-server; npm install; npx prisma migrate dev; npm run start:dev

# 3. Web
cd apps/web-dashboard; npm install; npm run dev

# 4. Mobile (ganti IP laptop, jangan localhost)
flutter run --dart-define=API_URL=http://192.168.1.10:3001
```

Detail setup, branch, testing, roadmap: `docs/11-dev-workflow-roadmap.md`.
