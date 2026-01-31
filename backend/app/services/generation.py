from app.models.models import Profile, Vacancy


def _is_german(vacancy: Vacancy) -> bool:
    german_markers = ["de", "germany", "berlin", "munich", "muenchen", "hamburg"]
    haystack = " ".join(
        filter(None, [vacancy.title or "", vacancy.location or "", vacancy.description or ""])
    ).lower()
    return any(marker in haystack for marker in german_markers)


def generate_texts(
    profile: Profile | None, vacancy: Vacancy, language: str | None = None
) -> tuple[str, str, str]:
    normalized = (language or "").lower()
    selected_language = normalized if normalized in {"de", "en", "ru"} else None
    if not selected_language:
        selected_language = "de" if _is_german(vacancy) else "en"

    name = profile.full_name if profile and profile.full_name else "Candidate"
    role = vacancy.title

    if selected_language == "de":
        cv = f"Lebenslauf für {name} - Zielrolle: {role}."
        cover = f"Anschreiben für {name} für die Position {role}."
        hr = f"Hallo, ich bewerbe mich auf {role}. Danke!"
    elif selected_language == "ru":
        cv = f"Резюме для {name} на позицию {role}."
        cover = f"Сопроводительное письмо для {name} на позицию {role}."
        hr = f"Здравствуйте, я подаюсь на {role}. Спасибо!"
    else:
        cv = f"Resume for {name} targeting {role}."
        cover = f"Cover letter for {name} applying to {role}."
        hr = f"Hi team, I'm applying for {role}. Thanks!"
    return cv, cover, hr
