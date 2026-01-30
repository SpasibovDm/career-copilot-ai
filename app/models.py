from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("Profile", back_populates="user", uselist=False)
    documents = relationship("Document", back_populates="user")


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    full_name = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    skills = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    storage_key = Column(String(255), nullable=False)
    parsed_text = Column(Text, nullable=True)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="documents")


class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    vacancy_id = Column(Integer, ForeignKey("vacancies.id"), nullable=False)
    score = Column(Float, nullable=False)
    explanation = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class GeneratedPackage(Base):
    __tablename__ = "generated_packages"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    language = Column(String(10), default="en")
    cv_text = Column(Text, nullable=False)
    cover_letter = Column(Text, nullable=False)
    hr_message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
