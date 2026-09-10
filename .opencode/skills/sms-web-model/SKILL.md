---
name: sms-web-model
description: Pola model Web Dashboard Next.js SMS (fetch via api-client, query key, form RHF+zod, tabel server-side). Pakai saat menambah halaman di apps/web-dashboard.
---

# SMS Web Model (Next.js App Router + TanStack Query)

Acuan: `docs/04-web-dashboard-design.md`. Kontrak: `docs/07-api-contract.md`.

## Aturan

1. Fetch hanya via `@/lib/api` (axios + interceptor token). Dilarang `fetch()` ad-hoc per halaman. Base URL dari `NEXT_PUBLIC_API_URL`.
2. Query key selalu bawa konteks filter: `['siswa', tahunAjaranId, rombelId, q, page]`. Lihat `src/lib/query-keys.ts` — tambah factory baru di sana, jangan bikin key inline berbeda-beda.
3. Tabel besar (siswa ±1000): server-side pagination + search debounce 300ms + filter di URL (`?q=&page=`) agar link bisa dibagikan. Tampilkan skeleton loading, empty ("Belum ada data — tambah/import"), error + tombol retry.
4. Form: `react-hook-form + zodResolver`. Schema zod sebisa mungkin diturunkan dari `packages/shared-types`. Error 409/422 backend tampil sebagai banner + highlight field, bukan alert mentah.
5. Operasi massal/berisiko (kenaikan kelas, import): pola preview → konfirmasi → submit → tampilkan progres. Dilarang update optimistis untuk operasi ini.
6. Export (Excel/PDF): via endpoint server (`/reports/...`), buka sebagai URL dengan token. Dilarang agregasi 1000 baris di browser.
7. Jangan hard-code rombel/tingkat/semester/mapel — selalu dari API (`GET /rombel?tahunAjaranId=`). Tanggal tampil WIB (`dd MMM yyyy HH:mm`), kirim ISO UTC.
8. Role dari `GET /auth/me` hanya untuk sembunyikan menu (UX). Penolakan akses tetap di backend.
9. Setiap halaman baru: cek `npm run build` lolos (type + lint Next).

## Contoh acuan di repo

- `src/lib/query-keys.ts` — factory query key.
- `src/hooks/use-rombel.ts` — contoh hook list dengan filter + pagination.
- `src/app/siswa/page.tsx` — contoh tabel + search + empty/error state.
