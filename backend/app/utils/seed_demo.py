from __future__ import annotations

from datetime import datetime, timedelta, timezone
import random

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.models import (
    Application,
    ApplicationStatus,
    GeneratedPackage,
    Match,
    Profile,
    User,
    Vacancy,
    VacancySource,
)


ADMIN_EMAIL = "admin@career-demo.ai"
ADMIN_PASSWORD = "Admin1234!"
DEMO_EMAIL = "demo@career-demo.ai"
DEMO_PASSWORD = "Demo1234!"


def seed_demo() -> None:
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if not admin:
            admin = User(
                email=ADMIN_EMAIL,
                hashed_password=get_password_hash(ADMIN_PASSWORD),
                is_admin=True,
            )
            db.add(admin)

        demo_user = db.query(User).filter(User.email == DEMO_EMAIL).first()
        if not demo_user:
            demo_user = User(
                email=DEMO_EMAIL,
                hashed_password=get_password_hash(DEMO_PASSWORD),
                is_admin=False,
            )
            db.add(demo_user)
        db.commit()
        db.refresh(admin)
        db.refresh(demo_user)

        profile = db.query(Profile).filter(Profile.user_id == demo_user.id).first()
        if not profile:
            profile = Profile(
                user_id=demo_user.id,
                full_name="Taylor Demo",
                location="Berlin, DE",
                desired_roles=["Product Manager", "Product Owner"],
                skills=["Roadmapping", "Stakeholder management", "SQL", "Figma"],
                languages={"en": "native", "de": "intermediate"},
                salary_min=60000,
                salary_max=90000,
            )
            db.add(profile)

        demo_vacancies = db.query(Vacancy).filter(Vacancy.external_id.like("demo-%")).all()
        demo_vacancy_ids = [vacancy.id for vacancy in demo_vacancies]
        if demo_vacancy_ids:
            db.query(Match).filter(Match.vacancy_id.in_(demo_vacancy_ids)).delete(synchronize_session=False)
            db.query(Application).filter(Application.vacancy_id.in_(demo_vacancy_ids)).delete(
                synchronize_session=False
            )
            db.query(GeneratedPackage).filter(GeneratedPackage.vacancy_id.in_(demo_vacancy_ids)).delete(
                synchronize_session=False
            )
            db.query(Vacancy).filter(Vacancy.id.in_(demo_vacancy_ids)).delete(synchronize_session=False)

        locations = ["Berlin", "Remote - EU", "Munich", "Hamburg", "Remote - Global", "Vienna"]
        titles = [
            "Product Manager",
            "Senior Product Manager",
            "Product Owner",
            "Growth Product Manager",
            "Technical Product Manager",
            "Product Operations Manager",
        ]
        companies = ["NovaTech", "Cloudspire", "Brightwave", "Pulse Labs", "Greenline", "Nucleus AI"]

        vacancies: list[Vacancy] = []
        for index in range(30):
            salary_min = random.choice([55000, 60000, 70000, 80000])
            salary_max = salary_min + random.choice([10000, 15000, 20000])
            location = random.choice(locations)
            vacancy = Vacancy(
                external_id=f"demo-{index + 1}",
                title=random.choice(titles),
                company=random.choice(companies),
                location=location,
                remote="Remote" in location,
                salary_min=salary_min,
                salary_max=salary_max,
                currency="EUR",
                description="Lead cross-functional teams to deliver roadmap milestones and customer outcomes.",
                source=VacancySource.manual,
                url="https://example.com/jobs/demo",
            )
            db.add(vacancy)
            vacancies.append(vacancy)

        db.commit()
        for vacancy in vacancies:
            db.refresh(vacancy)

        db.query(Match).filter(Match.user_id == demo_user.id).delete(synchronize_session=False)
        db.query(Application).filter(Application.user_id == demo_user.id).delete(synchronize_session=False)
        db.query(GeneratedPackage).filter(GeneratedPackage.user_id == demo_user.id).delete(
            synchronize_session=False
        )

        match_vacancies = vacancies[:20]
        for vacancy in match_vacancies:
            db.add(
                Match(
                    user_id=demo_user.id,
                    vacancy_id=vacancy.id,
                    score=random.uniform(62, 95),
                    explanation="Strong alignment with roadmap leadership and analytics.",
                    missing_skills=["GTM strategy", "Experiment design"],
                    matched_skills=["Stakeholder management", "SQL", "Figma"],
                    reasons=["Relevant product leadership experience", "Matching salary expectations"],
                )
            )

        for vacancy in vacancies[:5]:
            db.add(
                GeneratedPackage(
                    user_id=demo_user.id,
                    vacancy_id=vacancy.id,
                    cv_text="Demo CV tailored for the role.",
                    cover_letter_text="Demo cover letter highlighting product wins.",
                    hr_message_text="Demo HR message for outreach.",
                )
            )

        application_statuses = list(ApplicationStatus)
        for index, vacancy in enumerate(vacancies[:10]):
            status = application_statuses[index % len(application_statuses)]
            db.add(
                Application(
                    user_id=demo_user.id,
                    vacancy_id=vacancy.id,
                    status=status,
                    notes="Demo notes for recruiter follow-up.",
                    interview_notes="Demo interview notes.",
                )
            )

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo()
