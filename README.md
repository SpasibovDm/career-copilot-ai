# Career Copilot AI MVP

This repository contains a FastAPI-based MVP for career matching, document parsing, and ATS-ready package generation. It ships with Postgres, Redis + RQ worker, and MinIO (S3-compatible) storage via Docker Compose.

## Quickstart

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d --build
```

## End-to-end curl flow

```bash
# Register
curl -s -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}'

# Login
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'username=user@example.com&password=secret' | jq -r '.access_token')

# Create profile
curl -s -X POST http://localhost:8000/profiles/me \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Ada Lovelace","title":"Data Engineer","summary":"ETL, Python, SQL","skills":"python, sql, airflow","location":"Berlin"}'

# Upload a document (PDF/DOCX)
curl -s -X POST http://localhost:8000/documents/upload \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@/path/to/resume.pdf"

# Import vacancies (CSV with title,description,location,company)
cat <<'CSV' > /tmp/vacancies.csv
title,description,location,company
Data Engineer,We need python and SQL skills,Berlin,Example GmbH
CSV

curl -s -X POST http://localhost:8000/vacancies/import \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@/tmp/vacancies.csv"

# Or create a vacancy directly
VACANCY_ID=$(curl -s -X POST http://localhost:8000/vacancies/ \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Data Engineer","description":"We need python and SQL skills","location":"Berlin","company":"Example GmbH"}' | jq -r '.id')

# Generate match
MATCH_ID=$(curl -s -X POST http://localhost:8000/matches/generate/${VACANCY_ID} \
  -H "Authorization: Bearer ${TOKEN}" | jq -r '.id')

# Generate ATS-friendly package
curl -s -X POST http://localhost:8000/generate/${MATCH_ID} \
  -H "Authorization: Bearer ${TOKEN}"
```

## Notes
- Document parsing is asynchronous via Redis + RQ. The document status becomes `parsed` once the worker finishes.
- Language for generated packages is inferred: German (`de`) if the vacancy looks German, otherwise English (`en`).

## Development

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Testing

```bash
pytest
```
