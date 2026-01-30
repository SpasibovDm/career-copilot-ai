import uuid
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.models import DocumentKind, DocumentStatus, VacancySource


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
