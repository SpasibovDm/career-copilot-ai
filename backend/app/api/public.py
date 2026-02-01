from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import rate_limit_public
from app.models.models import GeneratedPackage, SharedLink
from app.schemas.schemas import PublicGeneratedPackageOut

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/generated/{token}", response_model=PublicGeneratedPackageOut)
def get_public_package(
    token: str,
    db: Session = Depends(get_db),
    _limit: None = Depends(rate_limit_public),
):
    link = db.query(SharedLink).filter(SharedLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Shared link not found")
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=404, detail="Shared link expired")
    package = db.query(GeneratedPackage).filter(GeneratedPackage.id == link.generated_package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    return PublicGeneratedPackageOut(
        id=package.id,
        vacancy_id=package.vacancy_id,
        cv_text=package.cv_text,
        cover_letter_text=package.cover_letter_text,
        hr_message_text=package.hr_message_text,
    )
