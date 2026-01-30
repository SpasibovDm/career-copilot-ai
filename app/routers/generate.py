from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user
from app.utils import detect_language, generate_documents

router = APIRouter(prefix="/generate", tags=["generate"])


@router.post("/{match_id}", response_model=schemas.GeneratedPackageResponse)
def generate_package(
    match_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    match = db.query(models.Match).get(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    profile = db.query(models.Profile).get(match.profile_id)
    if not profile or profile.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    vacancy = db.query(models.Vacancy).get(match.vacancy_id)
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")
    language = detect_language(vacancy.description)
    cv, cover, hr = generate_documents(
        profile.full_name,
        profile.title,
        vacancy.title,
        vacancy.company or "Team",
        language,
    )
    package = models.GeneratedPackage(
        match_id=match.id,
        language=language,
        cv_text=cv,
        cover_letter=cover,
        hr_message=hr,
    )
    db.add(package)
    db.commit()
    db.refresh(package)
    return package
