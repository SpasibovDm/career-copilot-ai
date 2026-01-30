import uuid
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from rq import Queue
from redis import Redis

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user
from app.storage import upload_file
from app.config import get_settings
from app.tasks import parse_document

router = APIRouter(prefix="/documents", tags=["documents"])

settings = get_settings()
redis_conn = Redis.from_url(settings.redis_url)
queue = Queue("documents", connection=redis_conn)


@router.post("/upload", response_model=schemas.DocumentResponse)
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if file.content_type not in [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ]:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    content = file.file.read()
    storage_key = f"{user.id}/{uuid.uuid4()}-{file.filename}"
    upload_file(storage_key, content, file.content_type)
    document = models.Document(
        user_id=user.id,
        filename=file.filename,
        content_type=file.content_type,
        storage_key=storage_key,
        status="pending",
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    queue.enqueue(parse_document, document.id)
    return document


@router.get("/me", response_model=list[schemas.DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return db.query(models.Document).filter(models.Document.user_id == user.id).all()
