from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis import Redis
from sqlalchemy import text

from app.api import admin, auth, generation, matching, me, vacancies
from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.middleware import RequestIdMiddleware, StructuredLoggingMiddleware
from app.api import public
from app.services.scheduler import start_scheduler
from app.services.storage import _use_local_storage
import boto3
from botocore.client import Config

app = FastAPI(title="Career Copilot AI")
settings = get_settings()

origins = [origin.strip() for origin in settings.cors_allow_origins.split(",") if origin.strip()]
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
app.add_middleware(RequestIdMiddleware)
app.add_middleware(StructuredLoggingMiddleware)

app.include_router(auth.router)
app.include_router(me.router)
app.include_router(vacancies.router)
app.include_router(matching.router)
app.include_router(generation.router)
app.include_router(admin.router)
app.include_router(public.router)


@app.on_event("startup")
def _startup():
    start_scheduler()


@app.get("/health")
def health():
    db_status = "ok"
    redis_status = "ok"
    minio_status = "ok"

    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001
        db_status = "error"
    finally:
        try:
            db.close()
        except Exception:  # noqa: BLE001
            pass

    try:
        Redis.from_url(settings.redis_url).ping()
    except Exception:  # noqa: BLE001
        redis_status = "error"

    try:
        if not _use_local_storage():
            client = boto3.client(
                "s3",
                endpoint_url=settings.s3_endpoint_url,
                aws_access_key_id=settings.s3_access_key,
                aws_secret_access_key=settings.s3_secret_key,
                region_name=settings.s3_region,
                config=Config(signature_version="s3v4"),
            )
            client.head_bucket(Bucket=settings.s3_bucket)
    except Exception:  # noqa: BLE001
        minio_status = "error"

    return {
        "status": "ok" if all(value == "ok" for value in (db_status, redis_status, minio_status)) else "degraded",
        "db": db_status,
        "redis": redis_status,
        "minio": minio_status,
    }
