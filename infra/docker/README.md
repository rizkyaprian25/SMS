# Docker Dev (Postgres + MinIO)

Pakai file `docker-compose.yml` di folder ini:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

- Postgres 16 di `:5432` (user/pass/db: `sms/sms/sms`).
- MinIO (S3 lokal) di `:9000` (console `:9001`, user/pass: `minioadmin/minioadmin`), bucket `sms-files` dibuat otomatis via job `mc`.
- Prod: ganti dengan managed Postgres + S3 sungguhan + backup harian (lihat `docs/11`).
