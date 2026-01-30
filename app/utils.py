import re
from typing import Tuple


def detect_language(text: str) -> str:
    sample = text.lower()
    german_markers = [" und ", " die ", " der ", " das ", " wir ", " sie ", "für", "über"]
    if any(marker in sample for marker in german_markers) or re.search(r"[äöüß]", sample):
        return "de"
    return "en"


def score_match(profile_text: str, vacancy_text: str) -> Tuple[float, str]:
    profile_tokens = set(re.findall(r"[a-zA-Zäöüß]+", profile_text.lower()))
    vacancy_tokens = set(re.findall(r"[a-zA-Zäöüß]+", vacancy_text.lower()))
    if not vacancy_tokens:
        return 0.0, "Vacancy description missing"
    overlap = profile_tokens.intersection(vacancy_tokens)
    score = round(len(overlap) / max(len(vacancy_tokens), 1) * 100, 2)
    explanation = f"Matched keywords: {', '.join(sorted(list(overlap))[:10]) or 'none'}"
    return score, explanation


def generate_documents(profile_name: str, profile_title: str, vacancy_title: str, company: str, language: str) -> Tuple[str, str, str]:
    if language == "de":
        cv = (
            f"{profile_name}\n"
            f"Berufsbezeichnung: {profile_title}\n"
            "Erfahrung und Projekte werden auf Anfrage bereitgestellt."
        )
        cover = (
            f"Sehr geehrtes Team {company},\n\n"
            f"ich bewerbe mich auf die Position {vacancy_title}. "
            f"Mit meiner Erfahrung als {profile_title} bringe ich relevante Kenntnisse mit.\n\n"
            "Mit freundlichen Grüßen\n"
            f"{profile_name}"
        )
        hr = (
            f"Hallo {company}-Team,\n"
            f"ich freue mich auf ein Gespräch zur Position {vacancy_title}. "
            "Gerne sende ich weitere Unterlagen."
        )
        return cv, cover, hr
    cv = (
        f"{profile_name}\n"
        f"Title: {profile_title}\n"
        "Experience and projects available upon request."
    )
    cover = (
        f"Dear {company} team,\n\n"
        f"I am excited to apply for the {vacancy_title} role. "
        f"With my background as a {profile_title}, I can contribute immediately.\n\n"
        "Sincerely,\n"
        f"{profile_name}"
    )
    hr = (
        f"Hello {company} team,\n"
        f"I would welcome the chance to discuss the {vacancy_title} position."
    )
    return cv, cover, hr
