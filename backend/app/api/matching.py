from fastapi import APIRouter, Depends
from redis import Redis
from rq import Queue
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User
from app.workers import tasks

router = APIRouter(prefix="/matching", tags=["matching"])
settings = get_settings()


@router.post("/run")
def run_matching(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    redis_conn = Redis.from_url(settings.redis_url)
    Queue("default", connection=redis_conn).enqueue(tasks.compute_matches, str(current_user.id))
    return {"status": "queued"}
