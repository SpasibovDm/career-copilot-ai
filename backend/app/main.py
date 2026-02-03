from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import boto3
from botocore.client import Config
from redis import Redis
from sqlalchemy import text

from app.api import admin, auth, generation, matching, me, vacancies
from app.core.config import get_settings
from app.core.middleware import RequestIdMiddleware, StructuredLoggingMiddleware
from app.api import public
from app.core.database import SessionLocal
from app.services.scheduler import start_scheduler
from app.services.storage import _use_local_storage

app = FastAPI(title="Career Copilot AI")
settings = get_settings()

default_origins = {"http://localhost:3000"}
env_origins = {origin.strip() for origin in settings.cors_allow_origins.split(",") if origin.strip()}
origins = sorted(default_origins | env_origins)
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

_DEFAULT_ERROR_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    413: "PAYLOAD_TOO_LARGE",
    422: "VALIDATION_ERROR",
}


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        payload = exc.detail
    else:
        payload = {"code": _DEFAULT_ERROR_CODES.get(exc.status_code, "ERROR"), "message": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content=payload, headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"code": "VALIDATION_ERROR", "message": "Validation failed", "details": exc.errors()},
    )


@app.on_event("startup")
def _startup():
    start_scheduler()


@app.get("/health")
def health():
    db_status = "ok"
    redis_status = "ok"
    minio_status = "ok"

    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001
        db_status = "error"
    finally:
        db.close()

    try:
        redis_conn = Redis.from_url(settings.redis_url)
        redis_conn.ping()
    except Exception:  # noqa: BLE001
        redis_status = "error"

    if not _use_local_storage():
        try:
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
        "status": "ok" if db_status == redis_status == minio_status == "ok" else "degraded",
        "db": db_status,
        "redis": redis_status,
        "minio": minio_status,
    }
