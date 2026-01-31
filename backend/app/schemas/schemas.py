import uuid
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.models import ApplicationStatus, DocumentKind, DocumentStatus, VacancySource


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
    title: str
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
    missing_skills: Optional[Dict[str, Any]] = None

    class Config:
        orm_mode = True


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


class ApplicationOut(BaseModel):
    id: uuid.UUID
    vacancy_id: uuid.UUID
    status: ApplicationStatus
    notes: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class StatsOut(BaseModel):
    vacancies_count: int
    matches_count: int
    documents_count: int
    documents_parsed_count: int
    applications_by_status: Dict[ApplicationStatus, int]
    last_matching_run_at: Optional[datetime] = None


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
