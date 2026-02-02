from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.models import (
    Document,
    DocumentStatus,
    GeneratedPackage,
    Match,
    Notification,
    NotificationType,
    Profile,
    User,
    Vacancy,
)
from app.services.generation import generate_texts
from app.services.matching import build_matches
from app.services.parsing import ParsingError, extract_text_from_file


def parse_document(document_id: str) -> None:
    db: Session = SessionLocal()
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return
        try:
            text, metadata = extract_text_from_file(document.s3_key)
            document.text_extracted = text
            document.extracted_json = metadata
            document.status = DocumentStatus.processed
            document.failure_reason = None
        except ParsingError as exc:
            document.status = DocumentStatus.failed
            document.failure_reason = str(exc)
            notification = Notification(
                user_id=document.user_id,
                type=NotificationType.document_failed,
                title="Document parsing failed",
                body=str(exc),
            )
            db.add(notification)
        db.commit()
    finally:
        db.close()


def compute_matches(user_id: str) -> None:
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        vacancies = db.query(Vacancy).all()
        matches = build_matches(profile, vacancies)
        db.query(Match).filter(Match.user_id == user_id).delete()
        top_matches = sorted(matches, key=lambda m: m.score, reverse=True)[:50]
        for match in top_matches:
            match.user_id = user_id
            db.add(match)
        if top_matches:
            db.add(
                Notification(
                    user_id=user_id,
                    type=NotificationType.matches,
                    title="New matches ready",
                    body=f"{len(top_matches)} matches updated for your profile.",
                )
            )
        if user:
            user.last_matching_run_at = datetime.now(timezone.utc)
        db.commit()
    finally:
        db.close()


def compute_matches_for_all() -> None:
    db: Session = SessionLocal()
    try:
        users = db.query(User).all()
        vacancies = db.query(Vacancy).all()
        for user in users:
            profile = db.query(Profile).filter(Profile.user_id == user.id).first()
            matches = build_matches(profile, vacancies)
            db.query(Match).filter(Match.user_id == user.id).delete()
            top_matches = sorted(matches, key=lambda m: m.score, reverse=True)[:50]
            for match in top_matches:
                match.user_id = user.id
                db.add(match)
            if top_matches:
                db.add(
                    Notification(
                        user_id=user.id,
                        type=NotificationType.matches,
                        title="New matches ready",
                        body=f"{len(top_matches)} matches updated for your profile.",
                    )
                )
            user.last_matching_run_at = datetime.now(timezone.utc)
        db.commit()
    finally:
        db.close()


def generate_package(user_id: str, vacancy_id: str, language: str | None = None) -> None:
    db: Session = SessionLocal()
    try:
        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
        if not vacancy:
            return
        cv_text, cover_text, hr_text = generate_texts(profile, vacancy, language)
        package = GeneratedPackage(
            user_id=user_id,
            vacancy_id=vacancy_id,
            cv_text=cv_text,
            cover_letter_text=cover_text,
            hr_message_text=hr_text,
        )
        db.add(package)
        db.commit()
    finally:
        db.close()
