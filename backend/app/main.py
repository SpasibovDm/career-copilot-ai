from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import admin, auth, generation, matching, me, vacancies
from app.core.config import get_settings
from app.core.middleware import RequestIdMiddleware, StructuredLoggingMiddleware
from app.api import public
from app.services.scheduler import start_scheduler

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
app.add_middleware(RequestIdMiddleware)
app.add_middleware(StructuredLoggingMiddleware)

app.include_router(auth.router)
app.include_router(me.router)
app.include_router(vacancies.router)
app.include_router(matching.router)
app.include_router(generation.router)
app.include_router(admin.router)
app.include_router(public.router)

_DEFAULT_ERROR_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    413: "PAYLOAD_TOO_LARGE",
    422: "VALIDATION_ERROR",
}


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        payload = exc.detail
    else:
        payload = {"code": _DEFAULT_ERROR_CODES.get(exc.status_code, "ERROR"), "message": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content=payload, headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"code": "VALIDATION_ERROR", "message": "Validation failed", "details": exc.errors()},
    )


@app.on_event("startup")
def _startup():
    start_scheduler()


@app.get("/health")
def health():
    return {"status": "ok"}
