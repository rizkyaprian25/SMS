# 11 — Dev Workflow, Setup Lokal & Roadmap

## 1. Setup Lokal

```powershell
# DB + storage lokal
docker compose -f infra/docker/docker-compose.yml up -d  # postgres:16 + minio (+redis opsional)
# Backend
cd services/api-server; npm install; npx prisma migrate dev; npm run start:dev   # :3001
# Web
cd apps/web-dashboard; npm install; npm run dev                                   # :3000
# Mobile (ganti IP laptop, jangan localhost)
flutter run --dart-define=API_URL=http://192.168.1.10:3001
```

Satu `.env.example` per app (tanpa nilai asli). Secret tidak pernah di-commit. Validasi env saat boot — gagal boot kalau kurang, jangan jalan setengah.

## 2. Branch & Commit

- `main` = produksi, `develop` = integrasi, `feat/<nama>` / `fix/<nama>` harian.
- Conventional Commits: `feat(api): ...`, `fix(web): ...`, `docs(db): ...`, `chore(infra): ...`.
- Satu PR = migrasi DB + endpoint + UI terkait bila perlu. Update `docs/` dalam PR yang sama.

## 3. Testing & Definition of Done

- Backend: `*.service.spec.ts` (bentrok jadwal, validasi role) + 1 e2e bulk absensi (happy path + 403 beda mapel).
- Web: `npm run lint && npm run build` lolos. Mobile: `flutter analyze && flutter test`.
- DoD tiap fitur: kontrak `docs/07` update → migrasi + `docs/02` bila ubah skema → RBAC + validasi → loading/empty/error state → test lolos → audit log bila sensitif.
- Checklist RBAC wajib sebelum rilis: lihat `docs/08` (guru A tidak bisa absen mapel guru B, dst).

## 4. Deploy & Operasi (hemat, 1 VPS cukup untuk MVP)

`Internet → Nginx/Caddy (:443 TLS) → / → web, /api → api → managed Postgres + S3 + backup harian (pg_dump, retensi 30 hari, tes restore bulanan).`

Checklist produksi: JWT secret + password admin diganti, TLS aktif, rate-limit login nyala, face embedding terenkripsi + consent tersimpan, HP versi lama masih bisa hit `/v1/`.

## 5. Roadmap

- **MVP:** auth+RBAC, master fleksibel, jadwal anti-bentrok, absensi manual bulk, presensi wajah, nilai+rapor PDF, dashboard+export.
- **Fase 2:** app siswa & ortu (lihat `docs/06`), tugas/PR, BK penuh, ekskul, chat wali-ortu.
- **Fase 3:** CBT/bank soal, analitik lanjut, Dapodik, surat otomatis.
