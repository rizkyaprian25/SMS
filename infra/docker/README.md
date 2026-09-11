# Docker Dev (Postgres + MinIO)

Pakai file `docker-compose.yml` di folder ini:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

- Postgres 16 di host `:5433` (container `:5432`, user/pass/db: `sms/sms/sms`). Port host 5433 agar tidak bentrok bila ada postgres proyek lain di 5432 — samakan dengan `DATABASE_URL` di `services/api-server/.env`.
- MinIO (S3 lokal) di `:9000` (console `:9001`, user/pass: `minioadmin/minioadmin`), bucket `sms-files` dibuat otomatis via job `mc`.
- Prod: ganti dengan managed Postgres + S3 sungguhan + backup harian (lihat `docs/11`).
