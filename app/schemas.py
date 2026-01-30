from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr

    class Config:
        orm_mode = True


class ProfileBase(BaseModel):
    full_name: str
    title: str
    summary: Optional[str] = None
    skills: Optional[str] = None
    location: Optional[str] = None


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(ProfileBase):
    pass


class ProfileResponse(ProfileBase):
    id: int
    user_id: int
    updated_at: datetime

    class Config:
        orm_mode = True


class DocumentResponse(BaseModel):
    id: int
    filename: str
    content_type: str
    status: str
    parsed_text: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True


class VacancyCreate(BaseModel):
    title: str
    description: str
    location: Optional[str] = None
    company: Optional[str] = None


class VacancyResponse(VacancyCreate):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True


class MatchResponse(BaseModel):
    id: int
    profile_id: int
    vacancy_id: int
    score: float
    explanation: str
    created_at: datetime

    class Config:
        orm_mode = True


class GeneratedPackageResponse(BaseModel):
    id: int
    match_id: int
    language: str
    cv_text: str
    cover_letter: str
    hr_message: str
    created_at: datetime

    class Config:
        orm_mode = True


class VacancyImportResult(BaseModel):
    imported: int
    errors: List[str]
