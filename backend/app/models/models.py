import enum
import uuid
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
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


class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    profile = relationship("Profile", back_populates="user", uselist=False)
    documents = relationship("Document", back_populates="user")
    matches = relationship("Match", back_populates="user")
    generated_packages = relationship("GeneratedPackage", back_populates="user")


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    desired_roles = Column(JSON, nullable=True)
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
    title = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    remote = Column(Boolean, default=False)
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    currency = Column(String(10), nullable=True)
    description = Column(Text, nullable=True)
    source = Column(Enum(VacancySource), nullable=False, default=VacancySource.manual)
    url = Column(String(512), nullable=True)

    matches = relationship("Match", back_populates="vacancy")
    generated_packages = relationship("GeneratedPackage", back_populates="vacancy")


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (UniqueConstraint("user_id", "vacancy_id", name="uq_match_user_vacancy"),)

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    vacancy_id = Column(GUID(), ForeignKey("vacancies.id"), nullable=False)
    score = Column(Float, nullable=False)
    explanation = Column(Text, nullable=True)
    missing_skills = Column(JSON, nullable=True)

    user = relationship("User", back_populates="matches")
    vacancy = relationship("Vacancy", back_populates="matches")


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
