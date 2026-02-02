from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
import boto3
from botocore.client import Config
from redis import Redis
from rq import Queue, Worker
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import require_admin
from app.models.models import Document, DocumentStatus, User, VacancyImportRun, VacancySourceConfig
from app.schemas.schemas import (
    AdminHealthOut,
    AdminMetricsOut,
    AdminQueueOut,
    AdminUserOut,
    AdminUsersResponse,
    VacancyImportRunOut,
    VacancySourceIn,
    VacancySourceOut,
)
from app.services.ingestion import ingest_source
from app.services.storage import _use_local_storage

router = APIRouter(prefix="/admin", tags=["admin"])
settings = get_settings()


@router.get("/users", response_model=AdminUsersResponse)
def list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    total = db.query(User).count()
    documents_count = func.count(Document.id).label("documents_count")
    query = (
        db.query(User, documents_count)
        .outerjoin(Document, Document.user_id == User.id)
        .group_by(User.id)
        .order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = [
        AdminUserOut(
            id=user.id,
            email=user.email,
            created_at=user.created_at,
            documents_count=doc_count,
        )
        for user, doc_count in query.all()
    ]
    return AdminUsersResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/jobs/queue", response_model=AdminQueueOut)
def queue_status(_admin: User = Depends(require_admin)):
    redis_conn = Redis.from_url(settings.redis_url)
    queue = Queue("default", connection=redis_conn)
    job_ids = queue.job_ids
    return AdminQueueOut(count=len(job_ids), job_ids=job_ids)


@router.get("/health", response_model=AdminHealthOut)
def health(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    redis_conn = Redis.from_url(settings.redis_url)
    queue = Queue("default", connection=redis_conn)
    workers = Worker.all(connection=redis_conn)
    last_heartbeat: datetime | None = None
    for worker in workers:
        if worker.last_heartbeat and (last_heartbeat is None or worker.last_heartbeat > last_heartbeat):
            last_heartbeat = worker.last_heartbeat
    redis_heartbeat = redis_conn.get("worker:last_heartbeat")
    if redis_heartbeat:
        heartbeat_time = datetime.fromisoformat(redis_heartbeat.decode())
        if last_heartbeat is None or heartbeat_time > last_heartbeat:
            last_heartbeat = heartbeat_time

    parsing_counts = {status.value: 0 for status in DocumentStatus}
    for status, count in (
        db.query(Document.status, func.count(Document.id))
        .group_by(Document.status)
        .all()
    ):
        parsing_counts[status.value] = int(count)

    db_status = "ok"
    redis_status = "ok"
    minio_status = "ok"

    try:
        db.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001
        db_status = "error"

    try:
        redis_conn.ping()
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

    return AdminHealthOut(
        queue_size=queue.count,
        workers=len(workers),
        last_worker_heartbeat=last_heartbeat,
        parsing_status_counts=parsing_counts,
        db=db_status,
        redis=redis_status,
        minio=minio_status,
    )


@router.get("/metrics", response_model=AdminMetricsOut)
def metrics(_admin: User = Depends(require_admin)):
    redis_conn = Redis.from_url(settings.redis_url)
    queue = Queue("default", connection=redis_conn)
    last_run = redis_conn.get("scheduler:last_run")
    return AdminMetricsOut(
        queue_size=queue.count,
        last_scheduler_run_at=datetime.fromisoformat(last_run.decode()) if last_run else None,
    )


@router.get("/vacancy-sources", response_model=list[VacancySourceOut])
def list_vacancy_sources(
    db: Session = Depends(get_db), _admin: User = Depends(require_admin)
):
    return db.query(VacancySourceConfig).order_by(VacancySourceConfig.created_at.desc()).all()


@router.post("/vacancy-sources", response_model=VacancySourceOut)
def create_vacancy_source(
    payload: VacancySourceIn,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    source = VacancySourceConfig(**payload.dict())
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@router.put("/vacancy-sources/{source_id}", response_model=VacancySourceOut)
def update_vacancy_source(
    source_id: str,
    payload: VacancySourceIn,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    source = db.query(VacancySourceConfig).filter(VacancySourceConfig.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    for field, value in payload.dict().items():
        setattr(source, field, value)
    db.commit()
    db.refresh(source)
    return source


@router.post("/vacancy-sources/{source_id}/run-now", response_model=VacancyImportRunOut)
def run_source_now(
    source_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    source = db.query(VacancySourceConfig).filter(VacancySourceConfig.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    run = ingest_source(db, source)
    return run


@router.get("/import-runs", response_model=list[VacancyImportRunOut])
def list_import_runs(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return (
        db.query(VacancyImportRun)
        .order_by(VacancyImportRun.started_at.desc())
        .limit(100)
        .all()
    )
