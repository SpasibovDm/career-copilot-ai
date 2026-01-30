# Architecture

## Overview
The MVP is composed of a FastAPI application, a background RQ worker, Postgres for persistence, Redis for queues, and MinIO for document storage.

## Components
- **API Service (FastAPI)**
  - Handles authentication, profile CRUD, vacancy ingestion, matching, and generation.
  - Enqueues document parsing jobs to RQ.
- **Worker (RQ)**
  - Consumes `documents` queue.
  - Downloads files from MinIO and extracts text for PDF/DOCX.
- **Postgres**
  - Stores users, profiles, documents, vacancies, matches, and generated packages.
- **Redis**
  - Backing store for RQ queues.
- **MinIO**
  - S3-compatible storage for uploaded documents.

## Data Flow
1. User registers and logs in to obtain JWTs.
2. User creates a profile and uploads documents.
3. Uploads are stored in MinIO; parsing tasks are queued in Redis.
4. Worker parses documents and persists text back into Postgres.
5. Vacancies are imported or created manually.
6. Matching compares profile data to vacancy descriptions and stores scores + explanations.
7. Generation produces ATS-friendly CV + cover letter + HR message in DE/EN.

## Database
Managed with SQLAlchemy models and Alembic migrations. See `alembic/versions/0001_init.py` for the schema.
