from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from redis import Redis
from rq import Queue
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import Document, DocumentKind, GeneratedPackage, Match, Profile, User
from app.schemas.schemas import DocumentOut, GeneratedPackageOut, MatchOut, ProfileIn, ProfileOut
from app.services.storage import upload_file
from app.workers import tasks

router = APIRouter(prefix="/me", tags=["me"])
settings = get_settings()


@router.get("/profile", response_model=ProfileOut)
def get_profile(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.put("/profile", response_model=ProfileOut)
def update_profile(
    payload: ProfileIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/documents/upload", response_model=DocumentOut)
def upload_document(
    kind: DocumentKind = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")
    s3_key = upload_file(file.file, file.filename)
    document = Document(user_id=current_user.id, kind=kind, s3_key=s3_key)
    db.add(document)
    db.commit()
    db.refresh(document)

    redis_conn = Redis.from_url(settings.redis_url)
    Queue("default", connection=redis_conn).enqueue(tasks.parse_document, str(document.id))

    return document


@router.get("/documents", response_model=list[DocumentOut])
def list_documents(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return db.query(Document).filter(Document.user_id == current_user.id).all()


@router.get("/documents/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = (
        db.query(Document)
        .filter(Document.user_id == current_user.id, Document.id == document_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/matches", response_model=list[MatchOut])
def list_matches(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return db.query(Match).filter(Match.user_id == current_user.id).all()


@router.get("/generated/{package_id}", response_model=GeneratedPackageOut)
def get_generated_package(
    package_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    package = (
        db.query(GeneratedPackage)
        .filter(GeneratedPackage.id == package_id, GeneratedPackage.user_id == current_user.id)
        .first()
    )
    if not package:
        raise HTTPException(status_code=404, detail="Generated package not found")
    return package
