from pathlib import Path
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from alembic import command
from alembic.config import Config

from app.database import SessionLocal, get_settings
from app.routes import admin, analytics, bookings, business, event_destination, event_discovery, events, explore, geocode, leads, listings, planner, reviews, riders, store, subscriptions, trail_talk, tracking
from app.seed import seed_database
from app.services.rider_safety import process_due_checkpoints, purge_expired_locations

settings = get_settings()
allowed_origins = [
    settings.frontend_url,
    "https://appalachiaoffroadapp.com",
    "https://www.appalachiaoffroadapp.com",
    "http://localhost:3000",
]
allowed_origins = list(dict.fromkeys(allowed_origins))

app = FastAPI(title="Appalachia Offroad API", version="0.1.0")
safety_worker_stop = threading.Event()


def safety_worker() -> None:
    while not safety_worker_stop.wait(60):
        db = SessionLocal()
        try:
            process_due_checkpoints(db)
            purge_expired_locations(db)
        except Exception:
            db.rollback()
        finally:
            db.close()

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
    safety_worker_stop.clear()
    threading.Thread(target=safety_worker, name="rider-safety-worker", daemon=True).start()


@app.on_event("shutdown")
def on_shutdown() -> None:
    safety_worker_stop.set()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(listings.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(leads.router, prefix="/api")
app.include_router(planner.router, prefix="/api")
app.include_router(business.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")
app.include_router(geocode.router, prefix="/api")
app.include_router(admin.router, prefix="/api/admin")
app.include_router(reviews.router, prefix="/api")
app.include_router(riders.router, prefix="/api")
app.include_router(store.router, prefix="/api")
app.include_router(subscriptions.router, prefix="/api")
app.include_router(trail_talk.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(event_discovery.router, prefix="/api/admin")
app.include_router(event_destination.router, prefix="/api")
app.include_router(tracking.router, prefix="/api")
app.include_router(explore.router, prefix="/api")
