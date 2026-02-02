from fastapi import APIRouter, Depends, HTTPException
from redis import Redis
from rq import Queue, Retry
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, Vacancy
from app.schemas.schemas import GeneratePackageRequest
from app.workers import tasks

router = APIRouter(prefix="/generation", tags=["generation"])
settings = get_settings()


@router.post("/{vacancy_id}", response_model=dict)
def generate_for_vacancy(
    vacancy_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    payload: GeneratePackageRequest | None = None,
):
    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")
    redis_conn = Redis.from_url(settings.redis_url)
    language = payload.language if payload else None
    Queue("default", connection=redis_conn).enqueue(
        tasks.generate_package,
        str(current_user.id),
        vacancy_id,
        language,
        retry=Retry(max=3, interval=[10, 30, 60]),
    )
    return {"status": "queued"}
