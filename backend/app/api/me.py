from datetime import datetime, timedelta, timezone
from io import BytesIO
import json
import secrets
import zipfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from redis import Redis
from rq import Queue
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import (
    Application,
    ApplicationStatus,
    ApplicationAttachment,
    Document,
    DocumentKind,
    DocumentStatus,
    GeneratedPackage,
    Match,
    Notification,
    Profile,
    Reminder,
    ReminderStatus,
    SharedLink,
    User,
    Vacancy,
)
from app.schemas.schemas import (
    ApplicationOut,
    ApplicationUpdate,
    ApplicationAttachmentOut,
    DocumentOut,
    ExportPdfRequest,
    ExportPdfResponse,
    GeneratedPackageOut,
    MatchOut,
    MatchDetailOut,
    NotificationOut,
    ProfileIn,
    ProfileOut,
    ReminderCreate,
    ReminderOut,
    ReminderUpdate,
    ShareLinkResponse,
    StatsOut,
)
from app.services.matching import build_match_detail
from app.services.pdf import render_package_pdf
from app.services.storage import download_file_content, generate_download_url, upload_file
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
    allowed_extensions = {".pdf", ".docx", ".txt"}
    filename_lower = file.filename.lower()
    if not any(filename_lower.endswith(ext) for ext in allowed_extensions):
        raise HTTPException(status_code=400, detail="Unsupported file type")
    if file.content_type not in {"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"}:
        raise HTTPException(status_code=400, detail="Unsupported MIME type")
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


@router.get("/matches/{match_id}", response_model=MatchDetailOut)
def get_match_detail(
    match_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    match = (
        db.query(Match)
        .filter(Match.id == match_id, Match.user_id == current_user.id)
        .first()
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    vacancy = db.query(Vacancy).filter(Vacancy.id == match.vacancy_id).first()
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")
    tokens, skill_gap_plan = build_match_detail(profile, vacancy, match)
    return MatchDetailOut(
        id=match.id,
        vacancy_id=match.vacancy_id,
        score=match.score,
        explanation=match.explanation,
        missing_skills=match.missing_skills,
        matched_skills=match.matched_skills,
        reasons=match.reasons,
        tokens=tokens,
        skill_gap_plan=skill_gap_plan,
    )


@router.get("/applications", response_model=list[ApplicationOut])
def list_applications(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return db.query(Application).filter(Application.user_id == current_user.id).all()


@router.put("/applications/{vacancy_id}", response_model=ApplicationOut)
def update_application(
    vacancy_id: str,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")
    application = (
        db.query(Application)
        .filter(Application.user_id == current_user.id, Application.vacancy_id == vacancy_id)
        .first()
    )
    if not application:
        application = Application(user_id=current_user.id, vacancy_id=vacancy_id)
        db.add(application)
    if payload.status:
        application.status = payload.status
    if payload.notes is not None:
        application.notes = payload.notes
    if payload.interview_notes is not None:
        application.interview_notes = payload.interview_notes
    db.commit()
    db.refresh(application)
    return application


@router.post("/applications/{vacancy_id}/attachments", response_model=ApplicationAttachmentOut)
def add_application_attachment(
    vacancy_id: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    application = (
        db.query(Application)
        .filter(Application.user_id == current_user.id, Application.vacancy_id == vacancy_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    document = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == current_user.id)
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    attachment = ApplicationAttachment(application_id=application.id, document_id=document.id)
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.post("/applications/{vacancy_id}/reminders", response_model=ReminderOut)
def create_reminder(
    vacancy_id: str,
    payload: ReminderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    application = (
        db.query(Application)
        .filter(Application.user_id == current_user.id, Application.vacancy_id == vacancy_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    due_at = payload.due_at
    if not due_at and payload.follow_up_days is not None:
        due_at = datetime.now(timezone.utc) + timedelta(days=payload.follow_up_days)
    if not due_at:
        raise HTTPException(status_code=400, detail="due_at or follow_up_days required")
    reminder = Reminder(
        user_id=current_user.id,
        application_id=application.id,
        title=payload.title,
        note=payload.note,
        due_at=due_at,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


@router.get("/reminders", response_model=list[ReminderOut])
def list_reminders(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return (
        db.query(Reminder)
        .filter(Reminder.user_id == current_user.id)
        .order_by(Reminder.due_at.asc())
        .all()
    )


@router.put("/reminders/{reminder_id}", response_model=ReminderOut)
def update_reminder(
    reminder_id: str,
    payload: ReminderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminder = (
        db.query(Reminder)
        .filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id)
        .first()
    )
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    if payload.status:
        reminder.status = payload.status
    if payload.snooze_until:
        reminder.due_at = payload.snooze_until
        reminder.status = ReminderStatus.snoozed
    db.commit()
    db.refresh(reminder)
    return reminder


@router.get("/notifications", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.put("/notifications/{notification_id}", response_model=NotificationOut)
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.put("/notifications/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    db.query(Notification).filter(Notification.user_id == current_user.id).update(
        {Notification.is_read: True}
    )
    db.commit()
    return {"status": "ok"}


@router.get("/stats", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vacancies_count = db.query(Vacancy).count()
    matches_count = db.query(Match).filter(Match.user_id == current_user.id).count()
    documents_count = db.query(Document).filter(Document.user_id == current_user.id).count()
    documents_parsed_count = (
        db.query(Document)
        .filter(Document.user_id == current_user.id, Document.status == DocumentStatus.processed)
        .count()
    )
    applications = (
        db.query(Application.status, func.count(Application.id))
        .filter(Application.user_id == current_user.id)
        .group_by(Application.status)
        .all()
    )
    applications_by_status = {status: count for status, count in applications}
    for status in ApplicationStatus:
        applications_by_status.setdefault(status, 0)
    last_matching_run_at = (
        db.query(func.max(Match.created_at))
        .filter(Match.user_id == current_user.id)
        .scalar()
    )
    upcoming_reminders = (
        db.query(Reminder)
        .filter(Reminder.user_id == current_user.id, Reminder.status == ReminderStatus.pending)
        .count()
    )
    return StatsOut(
        vacancies_count=vacancies_count,
        matches_count=matches_count,
        documents_count=documents_count,
        documents_parsed_count=documents_parsed_count,
        applications_by_status=applications_by_status,
        last_matching_run_at=last_matching_run_at,
        upcoming_reminders=upcoming_reminders,
    )


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


@router.post("/generated/{package_id}/export/pdf", response_model=ExportPdfResponse)
def export_generated_package_pdf(
    package_id: str,
    payload: ExportPdfRequest,
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
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    pdf_bytes = render_package_pdf(package, template=payload.template, profile=profile)
    filename = f"package-{package.id}-{payload.template}.pdf"
    key = upload_file(BytesIO(pdf_bytes), filename)
    package.export_pdf_s3_key = key
    db.commit()
    return ExportPdfResponse(download_url=generate_download_url(key))


@router.post("/generated/{package_id}/share", response_model=ShareLinkResponse)
def share_generated_package(
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
    token = secrets.token_urlsafe(16)
    existing = db.query(SharedLink).filter(SharedLink.generated_package_id == package.id).first()
    if existing:
        existing.token = token
        db.commit()
        link = existing
    else:
        link = SharedLink(generated_package_id=package.id, token=token)
        db.add(link)
        db.commit()
        db.refresh(link)
    return ShareLinkResponse(
        url=f"{settings.public_base_url}/public/generated/{link.token}",
        token=link.token,
        expires_at=link.expires_at,
    )


@router.delete("/generated/{package_id}/share")
def revoke_share_link(
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
    db.query(SharedLink).filter(SharedLink.generated_package_id == package.id).delete()
    db.commit()
    return {"status": "revoked"}


@router.get("/generated/{package_id}/bundle.zip")
def export_bundle(
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
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
        zipf.writestr("cv.txt", package.cv_text)
        zipf.writestr("cover_letter.txt", package.cover_letter_text)
        zipf.writestr("hr_message.txt", package.hr_message_text)
        metadata = {
            "package_id": str(package.id),
            "vacancy_id": str(package.vacancy_id),
        }
        zipf.writestr("metadata.json", json.dumps(metadata, indent=2))
        if package.export_pdf_s3_key:
            pdf_bytes = download_file_content(package.export_pdf_s3_key)
            if pdf_bytes:
                zipf.writestr("package.pdf", pdf_bytes)
    buffer.seek(0)
    headers = {"Content-Disposition": f"attachment; filename=package-{package.id}.zip"}
    return StreamingResponse(buffer, media_type="application/zip", headers=headers)


@router.get("/export")
def export_user_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    documents = db.query(Document).filter(Document.user_id == current_user.id).all()
    packages = db.query(GeneratedPackage).filter(GeneratedPackage.user_id == current_user.id).all()
    profile_payload = None
    if profile:
        profile_payload = {
            "full_name": profile.full_name,
            "location": profile.location,
            "desired_roles": profile.desired_roles,
            "skills": profile.skills,
            "languages": profile.languages,
            "salary_min": profile.salary_min,
            "salary_max": profile.salary_max,
        }
    data = {
        "user": {"id": str(current_user.id), "email": current_user.email},
        "profile": profile_payload,
        "documents": [
            {
                "id": str(doc.id),
                "kind": doc.kind.value,
                "status": doc.status.value,
                "s3_key": doc.s3_key,
            }
            for doc in documents
        ],
        "generated_packages": [
            {
                "id": str(pkg.id),
                "vacancy_id": str(pkg.vacancy_id),
                "cv_text": pkg.cv_text,
                "cover_letter_text": pkg.cover_letter_text,
                "hr_message_text": pkg.hr_message_text,
            }
            for pkg in packages
        ],
    }
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
        zipf.writestr("export.json", json.dumps(data, indent=2, default=str))
    buffer.seek(0)
    headers = {"Content-Disposition": "attachment; filename=career-copilot-export.zip"}
    return StreamingResponse(buffer, media_type="application/zip", headers=headers)


@router.delete("")
def delete_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Reminder).filter(Reminder.user_id == current_user.id).delete()
    db.query(Notification).filter(Notification.user_id == current_user.id).delete()
    db.query(ApplicationAttachment).filter(
        ApplicationAttachment.application_id.in_(
            db.query(Application.id).filter(Application.user_id == current_user.id)
        )
    ).delete(synchronize_session=False)
    db.query(Application).filter(Application.user_id == current_user.id).delete()
    db.query(Match).filter(Match.user_id == current_user.id).delete()
    db.query(Document).filter(Document.user_id == current_user.id).delete()
    db.query(SharedLink).filter(
        SharedLink.generated_package_id.in_(
            db.query(GeneratedPackage.id).filter(GeneratedPackage.user_id == current_user.id)
        )
    ).delete(synchronize_session=False)
    db.query(GeneratedPackage).filter(GeneratedPackage.user_id == current_user.id).delete()
    db.query(Profile).filter(Profile.user_id == current_user.id).delete()
    db.query(User).filter(User.id == current_user.id).delete()
    db.commit()
    return {"status": "deleted"}
