from typing import List

from app.models.models import Match, Profile, Vacancy


def score_vacancy(profile: Profile | None, vacancy: Vacancy) -> tuple[float, str, list[str]]:
    score = 0.0
    missing_skills: list[str] = []
    explanation_parts: list[str] = []

    if profile and profile.desired_roles:
        if any(role.lower() in (vacancy.title or "").lower() for role in profile.desired_roles):
            score += 50
            explanation_parts.append("Role matches desired roles")
        else:
            missing_skills.append("role_alignment")

    if vacancy.remote:
        score += 10
        explanation_parts.append("Remote friendly")

    if profile and profile.salary_min and vacancy.salary_max:
        if vacancy.salary_max >= profile.salary_min:
            score += 20
            explanation_parts.append("Salary meets minimum")
        else:
            missing_skills.append("salary_expectation")

    if profile and profile.languages:
        score += 10
        explanation_parts.append("Languages listed")

    return score, "; ".join(explanation_parts), missing_skills


def build_matches(profile: Profile | None, vacancies: List[Vacancy]) -> List[Match]:
    matches: list[Match] = []
    for vacancy in vacancies:
        score, explanation, missing_skills = score_vacancy(profile, vacancy)
        match = Match(
            vacancy_id=vacancy.id,
            score=score,
            explanation=explanation,
            missing_skills={"items": missing_skills},
        )
        matches.append(match)
    return matches
