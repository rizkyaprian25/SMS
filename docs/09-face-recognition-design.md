# 09 — Face Recognition (Presensi Guru)

> Keputusan MVP: on-device (gratis, privasi aman). Jangan pakai layanan cloud berbayar di MVP (biaya + data wajah keluar sekolah).

## Arsitektur

- HP (Flutter): deteksi wajah on-device (misal Google ML Kit) + model embedding TFLite (misal MobileFaceNet) → hasilkan **embedding** (vektor angka), bukan foto mentah.
- Liveness wajib aktif (kedip/angguk + texture check). Tanpa liveness = bisa dibobol foto/video.
- Server (`absensi-guru` module, lihat `docs/03`): terima embedding/skor → bandingkan cosine similarity dengan template terenkripsi → catat `absensi_guru`.

## Flow

**Enrollment (sekali, di TU, dengan consent tertulis UU PDP):**
1. Guru tanda tangan consent → simpan `consentAt + consentFileUrl` di `face_enrollment`.
2. Ambil 3–5 foto wajah → HP ekstrak embedding → `POST /absensi-guru/enroll` (nama endpoint final ikut `docs/07`).
3. Server enkripsi AES-256-GCM → kolom `embedding bytea`. Jangan pernah log embedding.

**Verify harian (masuk & pulang):**
1. HP: deteksi wajah → liveness → embedding → `POST /absensi-guru/masuk { face_score, liveness, lat, lng }` (pulang analog).
2. Server: cek `skor >= FACE_MIN_SCORE` (misal 0.6, bisa di-tune) + `liveness=true` → catat jam server (UTC).
3. Geofence opsional: di luar radius sekolah → warning + flag `di_luar_area=true` untuk admin (jangan hard-reject di awal).
4. Gagal 3x → tombol "Presensi Manual" → form alasan + foto bukti → `POST /absensi-guru/fallback` → `status_verifikasi=PENDING` → admin verifikasi (`POST /absensi-guru/:id/verifikasi {SETUJU/TOLAK}`).

## Privasi UU PDP (wajib)

- Embedding = data biometrik: enkripsi at-rest, tidak boleh di-return API list, tidak boleh masuk seed/log.
- Simpan `versiModel` agar bisa evaluasi ulang tanpa enroll massal.
- Guru boleh minta hapus data wajah (tombol di profil mobile) → nonaktifkan enrollment + audit.
- Audit tiap gagal beruntun + tiap fallback.

## Kriteria Sukses MVP

Enroll 50 guru < 2 mnt/orang, verify < 3 detik di 4G, false-reject < 5% di cahaya ruang kelas.
