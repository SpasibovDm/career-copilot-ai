import csv
from io import TextIOWrapper

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import Vacancy, VacancySource
from app.schemas.schemas import PaginatedVacanciesOut, VacancyOut

router = APIRouter(prefix="/vacancies", tags=["vacancies"])


def _parse_bool(value: str | None) -> bool:
    if not value:
        return False
    return value.strip().lower() in {"true", "1", "yes", "y"}


@router.post("/import/csv", response_model=list[VacancyOut])
def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="CSV file required")
    reader = csv.DictReader(TextIOWrapper(file.file, encoding="utf-8"))
    created: list[Vacancy] = []
    for row in reader:
        vacancy = Vacancy(
            title=row.get("title") or "Untitled",
            location=row.get("location"),
            remote=_parse_bool(row.get("remote")),
            salary_min=float(row["salary_min"]) if row.get("salary_min") else None,
            salary_max=float(row["salary_max"]) if row.get("salary_max") else None,
            currency=row.get("currency"),
            description=row.get("description"),
            url=row.get("url"),
            source=VacancySource.csv,
        )
        db.add(vacancy)
        created.append(vacancy)
    db.commit()
    for vacancy in created:
        db.refresh(vacancy)
    return created


@router.get("", response_model=PaginatedVacanciesOut)
def list_vacancies(
    q: str | None = Query(default=None),
    location: str | None = Query(default=None),
    remote: bool | None = Query(default=None),
    salary_min: float | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Vacancy)
    if q:
        query = query.filter(
            or_(
                Vacancy.title.ilike(f"%{q}%"),
                Vacancy.company.ilike(f"%{q}%"),
                Vacancy.description.ilike(f"%{q}%"),
            )
        )
    if location:
        query = query.filter(Vacancy.location.ilike(f"%{location}%"))
    if remote is not None:
        query = query.filter(Vacancy.remote == remote)
    if salary_min is not None:
        query = query.filter(Vacancy.salary_min >= salary_min)
    total = query.count()
    items = (
        query.order_by(Vacancy.title.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return PaginatedVacanciesOut(items=items, total=total, page=page, page_size=page_size)


@router.get("/{vacancy_id}", response_model=VacancyOut)
def get_vacancy(vacancy_id: str, db: Session = Depends(get_db)):
    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")
    return vacancy
