# Architecture

## Components
- **API (FastAPI)**: Serves authentication, profile management, document management, vacancy import, matching trigger, and generation trigger.
- **Worker (RQ)**: Handles document parsing, match scoring, and package generation asynchronously.
- **PostgreSQL**: Stores users, profiles, documents, vacancies, matches, and generated packages with UUID primary keys.
- **Redis**: Queue backend for RQ.
- **MinIO**: S3-compatible object storage for uploaded documents.

## Data Flow
1. User registers/logs in and updates their profile.
2. Documents are uploaded to MinIO; the worker parses content and stores text + metadata.
3. Vacancies are imported via CSV.
4. Matching job scores vacancies and stores top 50 matches per user.
5. Generation job builds ATS-friendly CV/cover letter/HR message based on vacancy and profile.

## Services
- `app/services/parsing.py`: PDF/DOCX parsing rules and OCR TODO handling.
- `app/services/matching.py`: Heuristic scoring and missing skills extraction.
- `app/services/generation.py`: Language-specific templated text generation.
