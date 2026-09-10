# 04 — Desain Web Dashboard (Admin & Kepala Sekolah)

> Stack: Next.js App Router + TypeScript + TanStack Query + react-hook-form + zod. Styling: Tailwind + shadcn/ui.

## Struktur Halaman

```
app/
├── login/                          # publik
├── (dashboard)/
│   ├── page.tsx                    # ringkasan (kepsek/admin)
│   ├── tahun-ajaran/               # tabel + aktifkan + arsip
│   ├── rombel/                     # filter tahun+tingkat → tambah/rename/arsip + atur wali
│   ├── siswa/                      # tabel 1000 siswa: search, filter rombel, import xlsx, detail
│   ├── siswa/[id]/                 # biodata + riwayat kelas + nilai + absensi
│   ├── guru/ + guru/[id]/          # + enrollment wajah (upload referensi + status consent)
│   ├── mapel/
│   ├── jadwal/                     # scheduler mingguan per rombel/guru + badge bentrok
│   ├── absensi-siswa/              # filter tanggal+rombel+mapel → tabel + rekap + export
│   ├── absensi-guru/               # rekap masuk/pulang/terlambat + verifikasi fallback
│   ├── nilai/                      # filter rombel+mapel+semester → grid input (admin) / baca (kepsek)
│   ├── perizinan/                  # antre approval (wali/admin)
│   ├── pengumuman/
│   ├── pelanggaran/                # BK (akses BK + wali terkait + admin)
│   └── laporan/                    # export excel/pdf
```

## Pola UI Wajib

- **List besar (siswa 1000):** server-side pagination (`page/limit`), search debounce 300ms, filter `tahunAjaranId` + `rombelId` di URL agar bisa share link. Query key: `['siswa', tahunAjaranId, rombelId, q, page]`.
- **Form master:** `react-hook-form + zodResolver`, schema import dari `packages/shared-types` bila bisa. Error backend (mis. 409 bentrok) tampil sebagai banner + highlight field.
- **Jadwal scheduler:** grid `hari × jam`, drag-and-drop ganti slot. Sebelum simpan, panggil `POST /jadwal` — kalau 409 tampilkan dialog "Bentrok dengan 8B jam 08:00 (Guru Sari)" + tombol pilih slot lain.
- **Rombel fleksibel:** dropdown tahun ajaran di atas halaman. Tombol "Tambah Rombel" → dialog `{ tingkat, nama (contoh 7I), wali, kapasitas }`. Tidak ada list hard-code.
- **Kenaikan kelas:** wizard 3 langkah: 1) pilih tahun asal→tujuan, 2) tabel mapping drag/otomatis (7A→8A...), 3) preview jumlah per rombel → centang konfirmasi → submit. Tampilkan job progress.
- **Dashboard kepsek:** kartu (total siswa/guru/rombel, hadir hari ini, alpa hari ini) dari `GET /dashboard/ringkasan` + grafik kehadiran 30 hari + tabel terlambat guru minggu ini.

## State & Data Fetching

- Semua fetch via `packages/api-client` (axios + interceptor refresh token). Dilarang `fetch()` manual per halaman.
- Auth: middleware cek cookie refresh → redirect `/login` jika 401. Role dari `GET /auth/me` disimpan di context untuk sembunyikan menu (tetap backend yang menolak).
- Export: tombol → `window.open('/api/v1/reports/absensi.xlsx?...')` dengan token. Jangan render 1000 baris lalu export di browser.

## Validasi UX Penting

- NISN 10 digit, NIP, tanggal lahir wajar, foto max 2MB (preview sebelum upload).
- Setiap halaman: skeleton loading, empty ("Belum ada siswa di rombel ini — tambah atau import"), error + tombol retry.
- Bahasa Indonesia semua label. Tanggal tampil WIB (`dd MMM yyyy HH:mm`), kirim ke API ISO UTC.

## Struktur Kode Web

```
apps/web-dashboard/src/
├── app/(dashboard)/...            # routing saja, logika di components/hooks
├── components/{ui/,tabel-data.tsx,form-*,dialog-*}
├── hooks/{use-siswa.ts,use-rombel.ts,use-jadwal.ts}
├── lib/{api-client.ts,auth.tsx,tanggal.ts}
└── middleware.ts
```

## DoD Web
- [ ] Pagination + search + filter tahun/rombel di semua tabel besar.
- [ ] 409 bentrok jadwal tampil ramah, bukan error mentah.
- [ ] Export Excel/PDF lewat endpoint server.
- [ ] `npm run lint && npm run build` lolos.
