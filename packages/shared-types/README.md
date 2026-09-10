# packages/shared-types — Tipe & DTO bersama (single source of truth)

Enum + DTO TypeScript: `StatusKehadiran (HADIR/IZIN/SAKIT/ALPA)`, `Role`, dsb. Di-import backend (`class-validator`) & web (`zod`). Untuk Dart, generate via OpenAPI (`docs/07`).

Aturan: tambah field opsional = minor (tetap `/v1`). Hapus/ubah wajib = `/v2`. Ubah di sini + `docs/07` dalam PR yang sama.
