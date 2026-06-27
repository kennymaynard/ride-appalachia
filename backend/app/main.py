from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from alembic import command
from alembic.config import Config

from app.database import SessionLocal, get_settings
from app.routes import admin, business, leads, listings, reviews, subscriptions, trail_talk
from app.seed import seed_database

settings = get_settings()
allowed_origins = [
    settings.frontend_url,
    "https://appalachiaoffroadapp.com",
    "https://www.appalachiaoffroadapp.com",
    "http://localhost:3000",
]
allowed_origins = list(dict.fromkeys(allowed_origins))

app = FastAPI(title="Appalachia Offroad API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    alembic_config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(alembic_config, "head")
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(listings.router, prefix="/api")
app.include_router(leads.router, prefix="/api")
app.include_router(business.router, prefix="/api")
app.include_router(admin.router, prefix="/api/admin")
app.include_router(reviews.router, prefix="/api")
app.include_router(subscriptions.router, prefix="/api")
app.include_router(trail_talk.router, prefix="/api")
