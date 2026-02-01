# Free Deployment (Single VPS)

This guide deploys Career Copilot on a single VPS using Docker Compose with free components only.

## 1. Prerequisites

- A VPS (2 vCPU / 4GB RAM recommended)
- Docker + Docker Compose
- A domain name (optional but recommended)

## 2. Clone the repo

```bash
git clone <your-repo-url>
cd career-copilot-ai
```

## 3. Configure environment

Create `.env` files for backend and frontend if needed. Example:

```
DATABASE_URL=postgresql+psycopg2://career:career@postgres:5432/career
REDIS_URL=redis://redis:6379/0
S3_ENDPOINT_URL=http://minio:9000
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio123
S3_BUCKET=documents
CORS_ALLOW_ORIGINS=https://your-domain.com
PUBLIC_BASE_URL=https://your-domain.com
```

## 4. Start services

```bash
cd infra
docker compose up -d --build
```

## 5. Reverse proxy (Caddy or Nginx)

### Caddy example

```
your-domain.com {
  reverse_proxy localhost:3000
}

api.your-domain.com {
  reverse_proxy localhost:8000
}
```

### Nginx example

```
server {
  server_name your-domain.com;
  location / {
    proxy_pass http://localhost:3000;
  }
}

server {
  server_name api.your-domain.com;
  location / {
    proxy_pass http://localhost:8000;
  }
}
```

## 6. Admin setup

1. Register an account in the UI.
2. Mark the user as admin in the database:

```sql
UPDATE users SET is_admin = true WHERE email = 'you@example.com';
```

3. Open the Admin page to configure vacancy sources and schedule ingestion.

## 7. Scheduler & jobs

The scheduler runs inside the backend container using APScheduler:

- Daily vacancy refresh
- Daily match recompute
- Reminder notifications every 30 minutes

## 8. Health & monitoring

- `GET /health` checks DB, Redis, and MinIO connectivity.
- `GET /admin/metrics` shows queue size + last scheduler run.

No paid services or billing integrations are required.
