import csv
from io import StringIO
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user

router = APIRouter(prefix="/vacancies", tags=["vacancies"])


@router.post("/", response_model=schemas.VacancyResponse)
def create_vacancy(
    vacancy_in: schemas.VacancyCreate,
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    vacancy = models.Vacancy(**vacancy_in.dict())
    db.add(vacancy)
    db.commit()
    db.refresh(vacancy)
    return vacancy


@router.post("/import", response_model=schemas.VacancyImportResult)
def import_vacancies(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(StringIO(content))
    imported = 0
    errors = []
    for index, row in enumerate(reader, start=1):
        if not row.get("title") or not row.get("description"):
            errors.append(f"Row {index} missing title or description")
            continue
        vacancy = models.Vacancy(
            title=row["title"],
            description=row["description"],
            location=row.get("location"),
            company=row.get("company"),
        )
        db.add(vacancy)
        imported += 1
    db.commit()
    return schemas.VacancyImportResult(imported=imported, errors=errors)


@router.get("/", response_model=list[schemas.VacancyResponse])
def list_vacancies(
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    return db.query(models.Vacancy).all()
