# 06 — Desain Mobile Siswa & Ortu (FASE 2 — Jangan Dibangun Dulu)

> Folder `apps/mobile-siswa-ortu/` masih placeholder. Dok ini agar keputusan MVP tidak mengunci Fase 2.

## Kenapa Ditunda?
Fokus MVP adalah alur guru+admin stabil (absensi, nilai, master). App siswa/ortu butuh data yang sama matang dulu + butuh kebijakan akun anak (privasi, multi-anak 1 ortu).

## Rencana App (1 codebase Flutter, 2 mode)

```
apps/mobile-siswa-ortu/lib/
├── features/{auth_siswa, auth_ortu, jadwal_saya, nilai_saya, absensi_saya,
│              tugas, izin_ajukan, pengumuman, chat_wali, profil_anak}
```

- **Mode Siswa:** login NISN+password (akun dibuat admin) → jadwal saya, nilai saya, absensi saya, tugas (upload foto/file), pengumuman kelas, profil.
- **Mode Ortu:** 1 akun bisa banyak anak (`ortu_anak` pivot) → switcher anak di atas → pantau absensi/nilai per anak, ajukan izin (+lampiran), terima push "Anak Alpa/Sakit", chat 1-1 dengan wali kelas (bukan grup).

## Yang Sudah Disiapkan di MVP (agar Fase 2 mudah)

| Kebutuhan Fase 2 | disiapkan di MVP |
|---|---|
| Akun siswa/ortu | tabel `pengguna` sudah punya `siswa_id` + role SISWA/ORANG_TUA; `siswa.data_ortu` JSONB |
| Multi-anak 1 ortu | tambah tabel pivot `ortu_anak (ortu_user_id, siswa_id)` — belum dibuat, tapi tidak merusak skema lama |
| Izin oleh ortu | `perizinan.diajukan_oleh` sudah ada (MVP diisi guru, Fase 2 diisi ortu) |
| Notifikasi alpa | `notifications` service + `devices` sudah ada; tinggal kirim ke token ortu |
| Chat wali-ortu | belum ada tabel; rencana `percakapan + pesan` dengan batas: hanya wali ↔ ortu siswa binaannya |

## Yang Dilarang di MVP
- Jangan bikin tabel/chat/izin versi "sementara" khusus untuk guru yang nanti bentrok dengan ortu. Pakai tabel final di `docs/02` dari awal.
- Jangan bikin endpoint `/ortu/*` duplikat. Nanti cukup tambah Guard role ORANG_TUA di endpoint yang sama + filter `siswa_id milik ortu`.

## Kriteria Mulai Fase 2
- [ ] MVP dipakai 1 semester, rekap absensi/nilai stabil.
- [ ] Data ortu (`no_hp`, relasi anak) sudah rapi >90% via import/admin.
- [ ] Kebijakan akun anak + consent ortu tertulis.
