---
name: sms-data-model
description: Konvensi model data Prisma/PostgreSQL SMS (relasi rombel, histori, migrasi aman, seed). Pakai sebelum mengubah schema.prisma atau seed.
---

# SMS Data Model (Prisma + PostgreSQL)

Acuan penuh: `docs/02-database-design.md`. Skema: `services/api-server/prisma/schema.prisma`.

## Prinsip yang tidak boleh dilanggar

1. `Rombel` selalu `(tingkat_id, tahun_ajaran_id, nama)` + `UNIQUE(tahun_ajaran_id, nama)`. Nama rombel (`7A`) hanya string di satu kolom ini — tabel lain referensi via `rombel_id`, jangan duplikat string nama.
2. Histori abadi: kenaikan kelas = insert `riwayat_kelas` + update `siswa.rombel_id` dalam transaction. Dilarang update `rombel_id` tanpa baris riwayat. Data akademik lama (absensi, nilai) tidak pernah dihapus/diubah saat naik kelas.
3. Soft-delete (`deleted_at`) untuk master (siswa, guru, rombel). Hard-delete dilarang untuk data historis.
4. Setiap tabel: `id UUID @default(uuid())`, `createdAt/updatedAt`. Tambah kolom baru sebagai nullable/ber-default agar migrasi tidak mengunci tabel besar.
5. Constraint unik pencegah dobel: `Absensi @@unique([siswaId, tanggal, mapelId, jamKe])`, `AbsensiGuru @@unique([guruId, tanggal])`, `Jadwal @@unique([rombelId, hari, jamMulai])`. Bentrok jam guru dicek di service (query overlap), bukan cuma constraint.
6. Data sensitif (`faceEmbeddingEnc`, `dataOrtu`, NISN): tidak ada di token JWT, tidak di-log, tidak di-return di endpoint list (mask NISN, jangan sertakan embedding).

## Workflow perubahan skema

```bash
cd services/api-server
# 1. edit schema.prisma
npx prisma validate
npx prisma migrate dev --name <jelas_pakai_snake_case>
npx prisma generate
# 2. update docs/02-database-design.md + docs/07-api-contract.md bila API terdampak
# 3. update seed.ts bila master baru (tahun ajaran, tingkat, mapel)
```

Dilarang `prisma db push` / `synchronize` di staging/prod. Seed awal (7A–7H, 8A–8G, 9A–9G) adalah data di `seed.ts`, bukan enum/constraint di skema.
