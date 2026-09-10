# apps/web-dashboard — DESIGN

Web Next.js admin/kepsek (MVP). Detail: `docs/04-web-dashboard-design.md`, kontrak: `docs/07-api-contract.md`.

- App Router + TypeScript + TanStack Query + react-hook-form + zod, styling Tailwind + shadcn/ui.
- Halaman: dashboard ringkasan, tahun-ajaran, rombel, siswa (+import xlsx), guru (+enrollment wajah), mapel, jadwal scheduler, absensi-siswa, absensi-guru, nilai, perizinan, pengumuman, pelanggaran (BK), laporan.
- Aturan: query key selalu bawa `tahunAjaranId`, tabel besar server pagination + search debounce 300ms, semua fetch via `packages/api-client`, dropdown dari API.

```powershell
npm install; npm run dev
npm run lint; npm run build
```
