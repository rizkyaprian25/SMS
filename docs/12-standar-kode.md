# 12 — Standar Kode: Scalable, Maintainable, Sustainable

Tiga kata ini artinya konkret di repo ini:

- **Scalable** (tambah fitur tanpa bongkar lama): 1 domain = 1 modul mandiri. Tambah `nilai` tidak menyentuh `rombel`. List selalu paginated agar tahan 1000+ siswa.
- **Maintainable** (orang baru cepat paham): struktur file seragam di semua domain + skill yang memaksa pola yang sama + test per service.
- **Sustainable** (murah dirawat jangka panjang): validasi + RBAC di server (1 tempat), tipe shared (`packages/shared-types`), histori DB tidak pernah dihapus, secret di env.

## Skill yang wajib dipakai agent

| Tugas | Skill | Cara pakai |
|---|---|---|
| Tambah/ubah endpoint | `sms-backend-model` | load skill → tiru `src/rombel/` |
| Ubah `schema.prisma`/seed | `sms-data-model` | load skill → migrate + update docs/02 |
| Tambah halaman web | `sms-web-model` | load skill → key di `query-keys.ts`, hook di `hooks/` |
| Tambah fitur Flutter | `sms-flutter-model` | load skill → repository + provider, bukan HTTP di screen |

Skill ada di `.opencode/skills/<nama>/SKILL.md` (format SKILL.md standar OpenCode, izin `allow` di `opencode.json`).

## Checklist tiap PR (DoD kode)

- [ ] Backend: controller ≤5 baris/handler, DTO tervalidasi, RBAC di guard + service, list paginated, sensitif → audit_log, `.spec.ts` hijau.
- [ ] DB: migrasi bernama jelas + docs/02 update + seed bila master. Tanpa `db push` di staging/prod.
- [ ] Web: key terpusat, tabel server-side, form RHF+zod, loading/empty/error state, `next build` hijau.
- [ ] Mobile: repository per fitur, `Page<T>` untuk list, offline hanya absensi, `flutter analyze` bersih.
- [ ] API berubah → docs/07 + `openapi.yaml` + kabari pemilik client lain.

## Yang dilarang (penyebab kode busuk di proyek sekolah)

1. Query Prisma di controller; HTTP/Dio langsung di screen Flutter; `fetch()` ad-hoc per halaman web.
2. Duplikat string nama rombel/mapel di banyak tabel — selalu FK + join.
3. Return array mentah untuk list; agregasi 1000 baris di browser/HP.
4. Log/menyimpan data sensitif (NISN, embedding wajah) di token, log, atau response list.
5. Endpoint tanpa test dan tanpa baris di docs/07.
