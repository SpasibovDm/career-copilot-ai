from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user
from app.utils import score_match

router = APIRouter(prefix="/matches", tags=["matches"])


@router.post("/generate/{vacancy_id}", response_model=schemas.MatchResponse)
def generate_match(
    vacancy_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    profile = db.query(models.Profile).filter(models.Profile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    vacancy = db.query(models.Vacancy).get(vacancy_id)
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")
    profile_text = " ".join(filter(None, [profile.summary, profile.skills, profile.title]))
    score, explanation = score_match(profile_text, vacancy.description)
    match = models.Match(
        profile_id=profile.id,
        vacancy_id=vacancy.id,
        score=score,
        explanation=explanation,
    )
    db.add(match)
    db.commit()
    db.refresh(match)
    return match


@router.get("/", response_model=list[schemas.MatchResponse])
def list_matches(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    profile = db.query(models.Profile).filter(models.Profile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return db.query(models.Match).filter(models.Match.profile_id == profile.id).all()
