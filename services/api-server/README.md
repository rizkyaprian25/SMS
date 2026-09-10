# API Server (NestJS + Prisma + PostgreSQL)

> Desain: `../../docs/03-backend-server-design.md`. DB: `../../docs/02-database-design.md`. Kontrak: `../../docs/07-api-contract.md`.

Scaffold nanti: `nest new .` + `prisma init` + modul per domain (lihat `docs/03`).

Wajib: `prisma/schema.prisma`, `prisma/seed.ts`, `openapi.yaml` (generate), `.env.example`.
Aturan: logika di service, validasi DTO, Guard RBAC, audit log fitur sensitif.
