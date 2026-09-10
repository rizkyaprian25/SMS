# Web Dashboard (Admin & Kepala Sekolah) — Next.js

> Desain: `../../docs/04-web-dashboard-design.md`. API: `../../docs/07-api-contract.md`.

Scaffold nanti: `npx create-next-app@latest . --ts --app --tailwind`.

Checklist awal:
- [ ] `lib/api-client.ts` dari `packages/api-client` (jangan fetch manual).
- [ ] Halaman: login, ringkasan, tahun-ajaran, rombel, siswa, guru, mapel, jadwal, absensi-siswa, absensi-guru, nilai, perizinan, pengumuman, laporan.
- [ ] Tabel besar: pagination server-side + search debounce.
