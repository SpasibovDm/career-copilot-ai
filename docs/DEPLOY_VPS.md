# Deploy on a single VPS (Hetzner / IONOS)

This guide shows how to deploy Career Copilot AI on a single VPS with Docker, Postgres, Redis,
MinIO (S3-compatible), and Caddy for automatic HTTPS.

## 1) Provision the VPS

- Ubuntu 22.04+ with 2–4 vCPU and 4–8 GB RAM.
- DNS record: `career.yourdomain.com` → VPS public IP.

Install Docker and Compose:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

## 2) Prepare environment variables

Create a `.env` file in the repo root (or a dedicated deploy folder):

```bash
POSTGRES_USER=career
POSTGRES_PASSWORD=change_me
POSTGRES_DB=career

DATABASE_URL=postgresql+psycopg2://career:change_me@postgres:5432/career
REDIS_URL=redis://redis:6379/0

S3_ENDPOINT_URL=http://minio:9000
S3_ACCESS_KEY=minio
S3_SECRET_KEY=change_me
S3_BUCKET=documents
S3_REGION=us-east-1

SECRET_KEY=change_me
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_MINUTES=43200

PUBLIC_BASE_URL=https://career.yourdomain.com
CORS_ALLOW_ORIGINS=https://career.yourdomain.com

NEXT_PUBLIC_API_URL=https://career.yourdomain.com
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_DEFAULT_LOCALE=en
NEXT_PUBLIC_LOCALES=de,en,ru
```

## 3) Minimal production compose

Create `docker-compose.prod.yml`:

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:15
    restart: unless-stopped
    env_file: .env
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    restart: unless-stopped
    env_file: .env
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_KEY}
    volumes:
      - minio_data:/data

  minio-mc:
    image: minio/mc:latest
    depends_on:
      - minio
    entrypoint: >
      /bin/sh -c "
      /usr/bin/mc alias set local http://minio:9000 ${S3_ACCESS_KEY} ${S3_SECRET_KEY} &&
      /usr/bin/mc mb --ignore-existing local/${S3_BUCKET} &&
      /usr/bin/mc anonymous set download local/${S3_BUCKET} &&
      exit 0;"

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    restart: unless-stopped
    env_file: .env
    depends_on:
      - postgres
      - redis
      - minio
    command: >
      /bin/sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"

  worker:
    build:
      context: .
      dockerfile: backend/Dockerfile
    restart: unless-stopped
    env_file: .env
    depends_on:
      - backend
      - redis
      - postgres
    command: python -m app.workers.worker

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    restart: unless-stopped
    env_file: .env
    depends_on:
      - backend

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infra/Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  minio_data:
  caddy_data:
  caddy_config:
```

Create `infra/Caddyfile`:

```
career.yourdomain.com {
  encode gzip
  route {
    reverse_proxy /auth* backend:8000
    reverse_proxy /me* backend:8000
    reverse_proxy /vacancies* backend:8000
    reverse_proxy /matching* backend:8000
    reverse_proxy /generation* backend:8000
    reverse_proxy /admin* backend:8000
    reverse_proxy /public* backend:8000
    reverse_proxy /health* backend:8000
    reverse_proxy /docs* backend:8000
    reverse_proxy /openapi* backend:8000
    reverse_proxy frontend:3000
  }
}
```

## 4) Start production stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

## 5) Backups

### Postgres

Create a daily cron job:

```bash
docker exec -t <postgres_container> pg_dump -U career career > /backups/career_$(date +%F).sql
```

Store backups off-site (S3, Backblaze, etc.).

### MinIO / S3

- Enable bucket versioning if supported by your object storage.
- Use a lifecycle policy for retention (e.g., 30–90 days).

## 6) Health checks

- Public health endpoint: `GET /health`
- Admin health dashboard: `/admin` (requires admin user)

## 7) Recommended VPS sizing

- **Small demo**: 2 vCPU / 4 GB RAM
- **Team pilot**: 4 vCPU / 8–16 GB RAM

Scale RQ workers by running more `worker` containers if queue depth grows.
