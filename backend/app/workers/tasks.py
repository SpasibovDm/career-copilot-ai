from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.models import Document, DocumentStatus, GeneratedPackage, Match, Profile, Vacancy
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
        db.commit()
    finally:
        db.close()


def compute_matches(user_id: str) -> None:
    db: Session = SessionLocal()
    try:
        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        vacancies = db.query(Vacancy).all()
        matches = build_matches(profile, vacancies)
        db.query(Match).filter(Match.user_id == user_id).delete()
        for match in sorted(matches, key=lambda m: m.score, reverse=True)[:50]:
            match.user_id = user_id
            db.add(match)
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
