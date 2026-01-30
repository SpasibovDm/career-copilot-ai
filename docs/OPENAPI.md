# OpenAPI Summary

Base URL: `http://localhost:8000`

## Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`

## Profile & Documents
- `GET /me/profile`
- `PUT /me/profile`
- `POST /me/documents/upload` (multipart form: `file`, `kind`)
- `GET /me/documents`
- `GET /me/documents/{id}`

## Vacancies
- `POST /vacancies/import/csv` (multipart form: `file`)
- `GET /vacancies` (filters: `q`, `location`, `remote`, `salary_min`)
- `GET /vacancies/{id}`

## Matching
- `POST /matching/run`
- `GET /me/matches`

## Generation
- `POST /generation/{vacancy_id}`
- `GET /me/generated/{id}`
