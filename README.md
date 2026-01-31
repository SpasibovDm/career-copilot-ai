# Career Copilot AI MVP

## Overview
This repository contains the MVP backend for Career Copilot AI built with FastAPI, SQLAlchemy, RQ workers, and PostgreSQL/Redis/MinIO. The schema uses UUID primary keys and can be reset safely for the MVP via the single Alembic migration in `backend/alembic/versions/0001_initial.py`.

> **Migration reset note:** For the MVP we reset migrations and ship a single initial migration. To reset locally, drop the database and re-run `alembic upgrade head`.

## Local Development

```bash
cp .env.example .env
cd infra
Docker compose up -d --build
```

The API will be available at `http://localhost:8000`.

## UI Local Dev

```bash
cd infra
docker compose up -d --build
```

Then open `http://localhost:3000` for the Career Copilot Portal. The frontend reads
`NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) for API calls.

### UI Flow (happy path)
1. Register or login from `/register` or `/login`.
2. Complete onboarding (`/onboarding`) with profile, documents, CSV import, and matching.
3. Visit `/dashboard` for KPIs + charts.
4. Browse `/vacancies` and `/matches` to generate packages.
5. Open `/packages/{id}` once a generated package is created.
6. Admins can review `/admin` for user and queue health.

### UI Screenshots (placeholders)
- Landing page: `docs/screenshots/landing.png`
- Dashboard: `docs/screenshots/dashboard.png`
- Onboarding wizard: `docs/screenshots/onboarding.png`
- Admin console: `docs/screenshots/admin.png`

## End-to-End cURL Flow

```bash
# Register
curl -s -X POST http://localhost:8000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r .access_token)

# Update profile
curl -s -X PUT http://localhost:8000/me/profile \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"full_name":"Test User","desired_roles":["Backend Engineer"],"languages":{"en": "native"},"salary_min":80000,"salary_max":120000}'

# Import vacancies from CSV
curl -s -X POST http://localhost:8000/vacancies/import/csv \
  -H "Authorization: Bearer ${TOKEN}" \
  -F file=@docs/sample_vacancies.csv

# Upload document (use your own .docx or text PDF)
curl -s -X POST http://localhost:8000/me/documents/upload \
  -H "Authorization: Bearer ${TOKEN}" \
  -F kind=resume -F file=@/path/to/resume.docx

# Run matching
curl -s -X POST http://localhost:8000/matching/run \
  -H "Authorization: Bearer ${TOKEN}"

# View matches
curl -s http://localhost:8000/me/matches \
  -H "Authorization: Bearer ${TOKEN}"

# Generate package
VACANCY_ID=$(curl -s http://localhost:8000/vacancies | jq -r '.[0].id')
curl -s -X POST http://localhost:8000/generation/${VACANCY_ID} \
  -H "Authorization: Bearer ${TOKEN}"
```

## Tests

```bash
cd backend
pytest
```

## Documentation
See:
- `docs/ARCHITECTURE.md`
- `docs/OPENAPI.md`
- `docs/UI.md`
