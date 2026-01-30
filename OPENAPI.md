# OpenAPI Overview

The API is served at `http://localhost:8000` with interactive docs at `/docs`.

## Authentication
- `POST /auth/register` — register user
- `POST /auth/login` — login, returns access + refresh token
- `POST /auth/refresh` — refresh tokens

## Profiles
- `POST /profiles/me` — create profile
- `GET /profiles/me` — fetch profile
- `PUT /profiles/me` — update profile

## Documents
- `POST /documents/upload` — upload PDF/DOCX for async parsing
- `GET /documents/me` — list uploaded documents

## Vacancies
- `POST /vacancies/` — create vacancy
- `POST /vacancies/import` — import CSV vacancies
- `GET /vacancies/` — list vacancies

## Matching
- `POST /matches/generate/{vacancy_id}` — generate match score
- `GET /matches/` — list matches

## Generation
- `POST /generate/{match_id}` — generate ATS-friendly CV, cover letter, and HR message

## Health
- `GET /health` — health check
