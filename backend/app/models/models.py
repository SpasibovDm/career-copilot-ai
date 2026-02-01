import enum
import uuid
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.utils.uuid import GUID


class DocumentKind(str, enum.Enum):
    resume = "resume"
    cover_letter = "cover_letter"
    other = "other"


class DocumentStatus(str, enum.Enum):
    pending = "pending"
    processed = "processed"
    failed = "failed"


class VacancySource(str, enum.Enum):
    manual = "manual"
    csv = "csv"
    api = "api"
    rss = "rss"
    html = "html"
    csv_url = "csv_url"


class VacancySourceType(str, enum.Enum):
    rss = "rss"
    html = "html"
    csv_url = "csv_url"
    manual = "manual"


class ApplicationStatus(str, enum.Enum):
    saved = "saved"
    applied = "applied"
    interview = "interview"
    offer = "offer"
    rejected = "rejected"


class ReminderStatus(str, enum.Enum):
    pending = "pending"
    done = "done"
    snoozed = "snoozed"


class NotificationType(str, enum.Enum):
    matches = "matches"
    document_failed = "document_failed"
    reminder_due = "reminder_due"


class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    profile = relationship("Profile", back_populates="user", uselist=False)
    documents = relationship("Document", back_populates="user")
    matches = relationship("Match", back_populates="user")
    generated_packages = relationship("GeneratedPackage", back_populates="user")
    applications = relationship("Application", back_populates="user")
    notifications = relationship("Notification")
    reminders = relationship("Reminder")


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    desired_roles = Column(JSON, nullable=True)
    skills = Column(JSON, nullable=True)
    languages = Column(JSON, nullable=True)
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)

    user = relationship("User", back_populates="profile")


class Document(Base):
    __tablename__ = "documents"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    kind = Column(Enum(DocumentKind), nullable=False)
    s3_key = Column(String(512), nullable=False)
    text_extracted = Column(Text, nullable=True)
    extracted_json = Column(JSON, nullable=True)
    status = Column(Enum(DocumentStatus), nullable=False, default=DocumentStatus.pending)
    failure_reason = Column(String(255), nullable=True)

    user = relationship("User", back_populates="documents")


class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    source_id = Column(GUID(), ForeignKey("vacancy_sources.id"), nullable=True)
    external_id = Column(String(255), nullable=True)
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    remote = Column(Boolean, default=False)
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    currency = Column(String(10), nullable=True)
    description = Column(Text, nullable=True)
    source = Column(Enum(VacancySource), nullable=False, default=VacancySource.manual)
    url = Column(String(512), nullable=True)

    source_config = relationship("VacancySourceConfig", back_populates="vacancies")
    matches = relationship("Match", back_populates="vacancy")
    generated_packages = relationship("GeneratedPackage", back_populates="vacancy")
    applications = relationship("Application", back_populates="vacancy")


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (UniqueConstraint("user_id", "vacancy_id", name="uq_match_user_vacancy"),)

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    vacancy_id = Column(GUID(), ForeignKey("vacancies.id"), nullable=False)
    score = Column(Float, nullable=False)
    explanation = Column(Text, nullable=True)
    missing_skills = Column(JSON, nullable=True)
    matched_skills = Column(JSON, nullable=True)
    reasons = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="matches")
    vacancy = relationship("Vacancy", back_populates="matches")


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("user_id", "vacancy_id", name="uq_application_user_vacancy"),
    )

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    vacancy_id = Column(GUID(), ForeignKey("vacancies.id"), nullable=False)
    status = Column(Enum(ApplicationStatus), nullable=False, default=ApplicationStatus.saved)
    notes = Column(Text, nullable=True)
    interview_notes = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="applications")
    vacancy = relationship("Vacancy", back_populates="applications")
    reminders = relationship("Reminder", back_populates="application")
    attachments = relationship("ApplicationAttachment", back_populates="application")


class GeneratedPackage(Base):
    __tablename__ = "generated_packages"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    vacancy_id = Column(GUID(), ForeignKey("vacancies.id"), nullable=False)
    cv_text = Column(Text, nullable=False)
    cover_letter_text = Column(Text, nullable=False)
    hr_message_text = Column(Text, nullable=False)
    export_pdf_s3_key = Column(String(512), nullable=True)

    user = relationship("User", back_populates="generated_packages")
    vacancy = relationship("Vacancy", back_populates="generated_packages")


class VacancySourceConfig(Base):
    __tablename__ = "vacancy_sources"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    type = Column(Enum(VacancySourceType), nullable=False)
    name = Column(String(255), nullable=False)
    url = Column(String(1024), nullable=True)
    config = Column(JSON, nullable=True)
    is_enabled = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    vacancies = relationship("Vacancy", back_populates="source_config")
    import_runs = relationship("VacancyImportRun", back_populates="source")


class VacancyImportRun(Base):
    __tablename__ = "vacancy_import_runs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    source_id = Column(GUID(), ForeignKey("vacancy_sources.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)
    inserted_count = Column(Float, nullable=False, default=0)
    updated_count = Column(Float, nullable=False, default=0)
    status = Column(String(50), nullable=False, default="running")
    error = Column(Text, nullable=True)

    source = relationship("VacancySourceConfig", back_populates="import_runs")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    application_id = Column(GUID(), ForeignKey("applications.id"), nullable=False)
    title = Column(String(255), nullable=False)
    note = Column(Text, nullable=True)
    due_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(ReminderStatus), nullable=False, default=ReminderStatus.pending)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    application = relationship("Application", back_populates="reminders")


class ApplicationAttachment(Base):
    __tablename__ = "application_attachments"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    application_id = Column(GUID(), ForeignKey("applications.id"), nullable=False)
    document_id = Column(GUID(), ForeignKey("documents.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    application = relationship("Application", back_populates="attachments")
    document = relationship("Document")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class SharedLink(Base):
    __tablename__ = "shared_links"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    generated_package_id = Column(GUID(), ForeignKey("generated_packages.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    package = relationship("GeneratedPackage")
