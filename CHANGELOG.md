# CHANGELOG

Format: `YYYY-MM-DD — ringkasan`.

## 2026-09-10
- Inisialisasi monorepo SMS (apps/services/packages/infra/docs).
- 12 dokumen desain lengkap di `docs/` (00 overview, 01 arsitektur multi-device pemula, 02 database, 03 backend, 04 web, 05 mobile guru, 06 fase 2, 07 kontrak API, 08 auth+RBAC, 09 face recognition, 10 notifikasi+offline sync, 11 workflow+roadmap).
- `AGENTS.md` + `README.md` + `infra/docker/docker-compose.yml` (postgres + minio).
- Skema penamaan: kebab-case (`apps/mobile-guru`, `services/api-server`). Scope MVP dikunci: mobile guru + web dashboard + satu backend.
- Scaffold runnable: `services/api-server` (NestJS + `prisma/schema.prisma` 17 model + `seed.ts` 22 rombel + `openapi.yaml`, `prisma validate` ✅, `nest build` ✅), `apps/web-dashboard` (Next.js 15 + login/ringkasan/siswa/rombel, `next build` ✅ 7 halaman), `apps/mobile-guru` (Flutter + Riverpod/go_router/Dio + 4 screen inti, `flutter analyze` ✅ no issues), `packages/shared-types` (enum + DTO, `tsc` ✅).
- Skill + standar scalable: 4 skill (`.opencode/skills/sms-{backend,data,web,flutter}-model`), `docs/12-standar-kode.md`, modul contoh `src/rombel/` (service+spec, `npm test` 3/3 ✅, `eslint` bersih), contoh `use-rombel.ts` + `query-keys.ts` (web), `page.dart` + `rombel_repository.dart` (mobile), `opencode.json` (skill allow).
