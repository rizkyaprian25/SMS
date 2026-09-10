# services/api-server — DESIGN

Backend tunggal SMS (satu-satunya yang boleh query DB). Detail: `docs/03-backend-server-design.md`, kontrak: `docs/07`, DB: `docs/02`, auth: `docs/08`.

## Keputusan (kunci, jangan debat ulang)
- NestJS + Prisma + PostgreSQL. Queue: Redis/BullMQ (atau cron sederhana di awal MVP). Storage: MinIO (dev) / S3 (prod).

## Struktur
```
src/
  main.ts  app.module.ts   # prefix /api/v1, ValidationPipe global
  common/{decorators/roles.decorator.ts, guards/jwt-auth.guard.ts + roles.guard.ts, filters/http-exception.filter.ts, pagination.ts}
  auth/ users/ tahun-ajaran/ tingkat/ rombel/ siswa/ guru/ mapel/ jadwal/
  absensi/ absensi-guru/ nilai/ rapor/ perizinan/ pengumuman/ pelanggaran/ notifications/ reports/ storage/
prisma/{schema.prisma, migrations/, seed.ts}
```

Satu domain = `*.controller.ts (tipis) + *.service.ts (bisnis) + dto/*.ts`. Dilarang query Prisma di controller.

```powershell
npm install; npx prisma migrate dev; npm run start:dev
npm run lint; npm test
```
