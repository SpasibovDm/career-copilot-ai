from __future__ import annotations

import re
from typing import Iterable, List, Tuple

from app.models.models import Match, Profile, Vacancy

STOPWORDS = {
    "en": {
        "the",
        "and",
        "for",
        "with",
        "from",
        "that",
        "this",
        "you",
        "your",
        "our",
        "are",
        "will",
        "can",
        "to",
        "of",
        "in",
        "on",
        "a",
        "an",
    },
    "de": {
        "und",
        "der",
        "die",
        "das",
        "mit",
        "für",
        "auf",
        "im",
        "in",
        "zu",
        "von",
        "ist",
        "sind",
        "wir",
        "sie",
        "du",
        "ihr",
    },
    "ru": {
        "и",
        "в",
        "на",
        "для",
        "по",
        "с",
        "что",
        "это",
        "вы",
        "мы",
        "как",
        "или",
        "но",
        "к",
        "из",
    },
}

SENIORITY_HINTS = {
    "junior": {"junior", "entry", "trainee"},
    "mid": {"mid", "middle", "intermediate"},
    "senior": {"senior", "lead", "principal"},
}

LANGUAGE_LEVEL_RE = re.compile(r"\b(a2|b1|b2|c1|c2)\b", re.IGNORECASE)


def _stem(token: str) -> str:
    for suffix in ("ing", "ed", "es", "s"):
        if token.endswith(suffix) and len(token) > len(suffix) + 2:
            return token[: -len(suffix)]
    for suffix in ("en", "er", "e", "n"):
        if token.endswith(suffix) and len(token) > len(suffix) + 2:
            return token[: -len(suffix)]
    for suffix in ("ов", "ев", "ий", "ая", "ые", "ого", "ыми"):
        if token.endswith(suffix) and len(token) > len(suffix) + 2:
            return token[: -len(suffix)]
    return token


def tokenize(text: str, locale: str | None = None) -> list[str]:
    if not text:
        return []
    locale_key = (locale or "en").lower()
    stopwords = STOPWORDS.get(locale_key, STOPWORDS["en"])
    tokens = re.findall(r"[\\w\\-+#]+", text.lower())
    cleaned = []
    for token in tokens:
        if token in stopwords or len(token) < 2:
            continue
        cleaned.append(_stem(token))
    return cleaned


def _extract_language_levels(text: str) -> set[str]:
    return {match.lower() for match in LANGUAGE_LEVEL_RE.findall(text or "")}


def _normalize_location(value: str | None) -> str:
    return (value or "").strip().lower()


def _build_skill_gap(missing_skills: list[str]) -> list[dict[str, str]]:
    gap_plan = []
    for skill in missing_skills[:5]:
        gap_plan.append(
            {
                "skill": skill,
                "link": f"https://example.com/learn/{skill.replace(' ', '-')}",
            }
        )
    return gap_plan


def score_vacancy(
    profile: Profile | None, vacancy: Vacancy, locale: str | None = None
) -> tuple[float, list[str], list[str], list[str], list[str]]:
    score = 0.0
    missing_skills: list[str] = []
    matched_skills: list[str] = []
    reasons: list[str] = []

    vacancy_text = " ".join(
        filter(None, [vacancy.title, vacancy.description or "", vacancy.location or "", vacancy.company or ""])
    )
    vacancy_tokens = set(tokenize(vacancy_text, locale))

    profile_roles = [role.lower() for role in profile.desired_roles] if profile and profile.desired_roles else []
    profile_skills = [skill.lower() for skill in profile.skills] if profile and profile.skills else []
    profile_tokens = set(tokenize(" ".join(profile_roles + profile_skills), locale))

    if profile_roles:
        if any(role in (vacancy.title or "").lower() for role in profile_roles):
            score += 30
            reasons.append("Role alignment with desired titles")
        else:
            missing_skills.append("role_alignment")

    overlap = vacancy_tokens.intersection(profile_tokens)
    if overlap:
        overlap_score = min(40.0, len(overlap) * 4.0)
        score += overlap_score
        matched_skills.extend(sorted(overlap))
        reasons.append("Skill overlap with your profile")
    else:
        missing_skills.append("skills_overlap")

    if vacancy.remote:
        score += 8
        reasons.append("Remote-friendly opportunity")

    if profile and profile.salary_min and vacancy.salary_max:
        if vacancy.salary_max >= profile.salary_min:
            score += 12
            reasons.append("Salary aligns with your target")
        else:
            missing_skills.append("salary_expectation")

    if profile and profile.languages:
        requested_levels = _extract_language_levels(vacancy_text)
        if requested_levels:
            score += 8
            reasons.append("Language level requirements detected")
        else:
            score += 4
            reasons.append("Languages listed in your profile")

    profile_location = _normalize_location(profile.location if profile else None)
    vacancy_location = _normalize_location(vacancy.location)
    if profile_location and vacancy_location:
        if profile_location == vacancy_location:
            score += 10
            reasons.append("Same city as your location")
        else:
            score += 2
            reasons.append("Location is different but still relevant")

    vacancy_title_tokens = set(tokenize(vacancy.title or "", locale))
    for level, hints in SENIORITY_HINTS.items():
        if hints.intersection(vacancy_title_tokens):
            score += 6
            reasons.append(f"Seniority hint detected ({level})")
            break

    if len(reasons) < 3:
        reasons.append("Vacancy matches your profile keywords")
    reasons = reasons[:6]

    missing = sorted(vacancy_tokens.difference(profile_tokens))[:8]
    for missing_skill in missing:
        if missing_skill not in missing_skills:
            missing_skills.append(missing_skill)

    return score, reasons, missing_skills, matched_skills, sorted(vacancy_tokens)


def build_matches(profile: Profile | None, vacancies: Iterable[Vacancy]) -> List[Match]:
    matches: list[Match] = []
    for vacancy in vacancies:
        score, reasons, missing_skills, matched_skills, _tokens = score_vacancy(profile, vacancy)
        explanation = "; ".join(reasons)
        match = Match(
            vacancy_id=vacancy.id,
            score=score,
            explanation=explanation,
            missing_skills=missing_skills,
            matched_skills=matched_skills,
            reasons=reasons,
        )
        matches.append(match)
    return matches


def build_match_detail(profile: Profile | None, vacancy: Vacancy, match: Match) -> Tuple[list[str], list[dict[str, str]]]:
    _, _, missing_skills, _, tokens = score_vacancy(profile, vacancy)
    return tokens, _build_skill_gap(missing_skills)
