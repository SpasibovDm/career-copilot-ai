from app.models.models import Profile, Vacancy


def _is_german(vacancy: Vacancy) -> bool:
    german_markers = ["de", "germany", "berlin", "munich", "muenchen", "hamburg"]
    haystack = " ".join(
        filter(None, [vacancy.title or "", vacancy.location or "", vacancy.description or ""])
    ).lower()
    return any(marker in haystack for marker in german_markers)


def generate_texts(profile: Profile | None, vacancy: Vacancy) -> tuple[str, str, str]:
    language = "DE" if _is_german(vacancy) else "EN"
    name = profile.full_name if profile and profile.full_name else "Candidate"
    role = vacancy.title
    if language == "DE":
        cv = f"Lebenslauf für {name} - Zielrolle: {role}."
        cover = f"Anschreiben für {name} für die Position {role}."
        hr = f"Hallo, ich bewerbe mich auf {role}. Danke!"
    else:
        cv = f"Resume for {name} targeting {role}."
        cover = f"Cover letter for {name} applying to {role}."
        hr = f"Hi team, I'm applying for {role}. Thanks!"
    return cv, cover, hr
