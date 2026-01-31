from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, auth, generation, matching, me, vacancies
from app.core.config import get_settings

app = FastAPI(title="Career Copilot AI")
settings = get_settings()

origins = [origin.strip() for origin in settings.cors_allow_origins.split(",") if origin.strip()]
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router)
app.include_router(me.router)
app.include_router(vacancies.router)
app.include_router(matching.router)
app.include_router(generation.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}
