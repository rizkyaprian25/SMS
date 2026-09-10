# Index Dokumentasi SMS SMP Negeri

> Baca berurutan jika baru pertama kali multi-device / mono-repo.

| # | File | Isi | Untuk siapa |
|---|---|---|---|
| 0 | `00-overview.md` | Gambaran produk, user, scope MVP vs Fase 2/3 | Semua |
| 1 | `01-architecture-mono-repo.md` | Diagram arsitektur, kenapa mono-repo, alur multi-device | Semua, wajib pemula |
| 2 | `02-database-design.md` | ERD, definisi tabel, relasi, seed rombel, migrasi | Backend, agent DB |
| 3 | `03-backend-server-design.md` | Desain NestJS: modul, layering, validasi, file, export | Backend |
| 4 | `04-web-dashboard-design.md` | Desain Web Admin/Kepsek: halaman, tabel, form | Frontend web |
| 5 | `05-mobile-guru-design.md` | Desain Mobile Guru: screen, flow absensi, offline | Flutter |
| 6 | `06-mobile-siswa-ortu-phase2.md` | Desain Fase 2 (jangan implement dulu) | Perencana |
| 7 | `07-api-contract.md` | Daftar endpoint REST `/api/v1` + format request/response | Semua client |
| 8 | `08-auth-rbac-multidevice.md` | Login, JWT, refresh, RBAC matrix, multi-device session | Backend + client |
| 9 | `09-face-recognition-design.md` | Presensi wajah: enroll, liveness, privasi UU PDP | Mobile + backend |
| 10 | `10-notification-offline-sync.md` | FCM, antre offline absensi, sinkronisasi | Mobile + backend |
| 11 | `11-dev-workflow-roadmap.md` | Setup lokal, branch, testing, roadmap MVP→Fase 3 | Semua |
| 12 | `12-standar-kode.md` | Standar scalable/maintainable/sustainable + daftar skill | Semua |

Konvensi:
- Bahasa UI Indonesia, bahasa kode Inggris.
- `docs/` adalah desain. Kode mengikuti docs. Ubah kode + docs dalam PR yang sama.
- Rombel (`7A` dst) adalah **data seed**, bukan konstanta kode.
