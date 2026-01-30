from fastapi import FastAPI

from app.routers import auth, profiles, documents, vacancies, matches, generate

app = FastAPI(title="Career Copilot AI")

app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(documents.router)
app.include_router(vacancies.router)
app.include_router(matches.router)
app.include_router(generate.router)


@app.get("/health")
def health():
    return {"status": "ok"}
