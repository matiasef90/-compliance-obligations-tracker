import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.crypto import CryptoError
from app.domain.obligation import DocumentRequiredError, InvalidTransitionError
from app.repositories.obligation_repo import ConcurrencyError, NotFoundError, PersistenceError
from app.routes.obligations import router as obligations_router

app = FastAPI(title="Compliance Obligations Tracker")

_static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
app.mount("/static", StaticFiles(directory=_static_dir), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(obligations_router)


@app.exception_handler(InvalidTransitionError)
async def invalid_transition_handler(request: Request, exc: InvalidTransitionError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"error": "INVALID_TRANSITION", "detail": str(exc), "status": 422},
    )


@app.exception_handler(DocumentRequiredError)
async def document_required_handler(request: Request, exc: DocumentRequiredError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"error": "DOCUMENT_REQUIRED", "detail": str(exc), "status": 422},
    )


@app.exception_handler(ConcurrencyError)
async def concurrency_handler(request: Request, exc: ConcurrencyError) -> JSONResponse:
    return JSONResponse(
        status_code=409,
        content={"error": "CONFLICT", "detail": str(exc), "status": 409},
    )


@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={"error": "NOT_FOUND", "detail": str(exc), "status": 404},
    )


@app.exception_handler(PersistenceError)
async def persistence_handler(request: Request, exc: PersistenceError) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"error": "PERSISTENCE_ERROR", "detail": "Could not persist the change.", "status": 500},
    )


@app.exception_handler(CryptoError)
async def crypto_handler(request: Request, exc: CryptoError) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"error": "CRYPTO_ERROR", "detail": "Could not process sensitive data.", "status": 500},
    )


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
