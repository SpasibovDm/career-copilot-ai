from fastapi import FastAPI

from app.api import auth, generation, matching, me, vacancies

app = FastAPI(title="Career Copilot AI")

app.include_router(auth.router)
app.include_router(me.router)
app.include_router(vacancies.router)
app.include_router(matching.router)
app.include_router(generation.router)


@app.get("/health")
def health():
    return {"status": "ok"}
