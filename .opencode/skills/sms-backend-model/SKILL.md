---
name: sms-backend-model
description: Pola model backend NestJS SMS yang scalable (modul per domain, controller tipis, DTO, RBAC, audit, test). Pakai saat menambah/mengubah endpoint di services/api-server.
---

# SMS Backend Model (NestJS + Prisma)

## Anatomi modul (wajib sama untuk semua domain)

```
src/<domain>/
├── <domain>.module.ts
├── <domain>.controller.ts   # tipis: guard + panggil service, tanpa query Prisma
├── <domain>.service.ts      # seluruh logika bisnis + cek RBAC lanjutan di sini
├── dto/
│   ├── create-<domain>.dto.ts
│   ├── update-<domain>.dto.ts
│   └── query-<domain>.dto.ts  # extends PaginationQueryDto
└── <domain>.service.spec.ts   # unit test dengan PrismaService mock
```

## Aturan

1. Controller: hanya `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)` + delegasi ke service. Maksimal 5 baris per handler.
2. Validasi di DTO dengan `class-validator` (`@IsUUID()`, `@IsEnum()`, `@Matches()` untuk nama rombel `^[7-9][A-Z]$`). Global pipe sudah `whitelist + forbidNonWhitelisted`.
3. Cek kepemilikan di service, bukan controller: contoh absensi cek `guru_mapel`; wali kelas cek `rombel.waliKelasId == user.guruId`. UI boleh sembunyikan tombol, backend yang menolak (403).
4. List selalu paginated: pakai `pageParams()` + `pageMeta()` dari `src/common/pagination.ts`, query via `PaginationQueryDto`. Jangan return array mentah.
5. Tulis: bungkus multi-tabel dalam `prisma.$transaction`. Operasi sensitif (edit absensi hari-H, kenaikan kelas, verifikasi fallback, BK) tulis baris `audit_log` (`sebelum/sesudah`).
6. Jam sensitif pakai jam server (`new Date()`), bukan input client. Tanggal tampil WIB di client, simpan UTC.
7. Error: lempar `HttpException` Nest (`NotFoundException`, `ConflictException` untuk bentrok/duplikat, `ForbiddenException`). Jangan bocorkan stack — filter global menyeragamkan format.
8. Upload: validasi mime + size di server, simpan via `StorageService` (S3/MinIO), DB hanya `file_url`.
9. Test: tiap service punya `.spec.ts` (happy path + 1 kasus ditolak). Mock `PrismaService` dengan `useValue`, jangan konek DB asli.
10. Selesai 1 endpoint = update `docs/07-api-contract.md` + `openapi.yaml` dalam PR yang sama.

## Contoh acuan di repo

- `src/rombel/` — modul contoh lengkap (CRUD + arsip + pagination + spec). Tiru strukturnya untuk domain lain.
- `src/common/pagination.ts`, `src/common/dto/pagination-query.dto.ts`, `src/common/utils/haversine.ts`.
