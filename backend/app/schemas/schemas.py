import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.models import (
    ApplicationStatus,
    DocumentKind,
    DocumentStatus,
    NotificationType,
    ReminderStatus,
    VacancySource,
    VacancySourceType,
)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr

    class Config:
        orm_mode = True


class ProfileIn(BaseModel):
    full_name: Optional[str] = None
    location: Optional[str] = None
    desired_roles: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    languages: Optional[Dict[str, Any]] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None


class ProfileOut(ProfileIn):
    id: uuid.UUID
    user_id: uuid.UUID

    class Config:
        orm_mode = True


class DocumentOut(BaseModel):
    id: uuid.UUID
    kind: DocumentKind
    s3_key: str
    text_extracted: Optional[str] = None
    extracted_json: Optional[Dict[str, Any]] = None
    status: DocumentStatus
    failure_reason: Optional[str] = None

    class Config:
        orm_mode = True


class VacancyOut(BaseModel):
    id: uuid.UUID
    source_id: Optional[uuid.UUID] = None
    external_id: Optional[str] = None
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    remote: bool
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    source: VacancySource
    url: Optional[str] = None

    class Config:
        orm_mode = True


class MatchOut(BaseModel):
    id: uuid.UUID
    vacancy_id: uuid.UUID
    score: float
    explanation: Optional[str] = None
    missing_skills: Optional[List[str]] = None
    matched_skills: Optional[List[str]] = None
    reasons: Optional[List[str]] = None

    class Config:
        orm_mode = True


class MatchDetailOut(MatchOut):
    tokens: Optional[List[str]] = None
    skill_gap_plan: Optional[List[Dict[str, str]]] = None


class GeneratedPackageOut(BaseModel):
    id: uuid.UUID
    vacancy_id: uuid.UUID
    cv_text: str
    cover_letter_text: str
    hr_message_text: str
    export_pdf_s3_key: Optional[str] = None

    class Config:
        orm_mode = True


class ExportPdfRequest(BaseModel):
    template: Literal["minimal", "modern", "classic"] = "modern"


class ExportPdfResponse(BaseModel):
    download_url: str


class GeneratePackageRequest(BaseModel):
    language: Optional[Literal["de", "en", "ru"]] = None


class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    notes: Optional[str] = None
    interview_notes: Optional[str] = None


class ApplicationOut(BaseModel):
    id: uuid.UUID
    vacancy_id: uuid.UUID
    status: ApplicationStatus
    notes: Optional[str] = None
    interview_notes: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class ApplicationAttachmentOut(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    document_id: uuid.UUID
    created_at: datetime

    class Config:
        orm_mode = True


class ScoreHistogramBucket(BaseModel):
    range: str
    count: int


class SalaryBucket(BaseModel):
    title: str
    min: float
    max: float


class ActivityBucket(BaseModel):
    date: date
    matches_created: int
    packages_generated: int


class StatsOut(BaseModel):
    vacancies_count: int
    matches_count: int
    documents_count: int
    documents_parsed_count: int
    applications_by_status: Dict[ApplicationStatus, int]
    score_histogram_data: List[ScoreHistogramBucket]
    salary_buckets_data: List[SalaryBucket]
    activity_last_14_days: List[ActivityBucket]
    last_matching_run_at: Optional[datetime] = None
    upcoming_reminders: int = 0


class AdminUserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    created_at: datetime
    documents_count: int


class AdminUsersResponse(BaseModel):
    items: List[AdminUserOut]
    total: int
    page: int
    page_size: int


class AdminQueueOut(BaseModel):
    count: int
    job_ids: List[str]


class AdminHealthOut(BaseModel):
    queue_size: int
    workers: int
    last_worker_heartbeat: Optional[datetime] = None
    db: str
    redis: str
    minio: str


class AdminMetricsOut(BaseModel):
    queue_size: int
    last_scheduler_run_at: Optional[datetime] = None


class VacancySourceIn(BaseModel):
    type: VacancySourceType
    name: str
    url: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_enabled: bool = True


class VacancySourceOut(VacancySourceIn):
    id: uuid.UUID
    created_at: datetime

    class Config:
        orm_mode = True


class VacancyImportRunOut(BaseModel):
    id: uuid.UUID
    source_id: uuid.UUID
    started_at: datetime
    finished_at: Optional[datetime] = None
    inserted_count: float
    updated_count: float
    status: str
    error: Optional[str] = None

    class Config:
        orm_mode = True


class ReminderCreate(BaseModel):
    title: str
    note: Optional[str] = None
    due_at: Optional[datetime] = None
    follow_up_days: Optional[int] = None


class ReminderOut(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    title: str
    note: Optional[str] = None
    due_at: datetime
    status: ReminderStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class ReminderUpdate(BaseModel):
    status: Optional[ReminderStatus] = None
    snooze_until: Optional[datetime] = None


class NotificationOut(BaseModel):
    id: uuid.UUID
    type: NotificationType
    title: str
    body: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        orm_mode = True


class ShareLinkResponse(BaseModel):
    url: str
    token: str
    expires_at: Optional[datetime] = None


class ExportBundleResponse(BaseModel):
    download_url: str


class PublicGeneratedPackageOut(BaseModel):
    id: uuid.UUID
    vacancy_id: uuid.UUID
    cv_text: str
    cover_letter_text: str
    hr_message_text: str
