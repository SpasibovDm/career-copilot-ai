from datetime import datetime

from fastapi import APIRouter, Depends, Query
from redis import Redis
from rq import Queue, Worker
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import require_admin
from app.models.models import Document, User
from app.schemas.schemas import AdminHealthOut, AdminQueueOut, AdminUserOut, AdminUsersResponse

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
def health(_admin: User = Depends(require_admin)):
    redis_conn = Redis.from_url(settings.redis_url)
    queue = Queue("default", connection=redis_conn)
    workers = Worker.all(connection=redis_conn)
    last_heartbeat: datetime | None = None
    for worker in workers:
        if worker.last_heartbeat and (last_heartbeat is None or worker.last_heartbeat > last_heartbeat):
            last_heartbeat = worker.last_heartbeat
    return AdminHealthOut(
        queue_size=queue.count,
        workers=len(workers),
        last_worker_heartbeat=last_heartbeat,
    )
