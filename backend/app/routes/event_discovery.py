from datetime import date, datetime
import secrets

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Event, EventCandidate, EventSource, EventSourceScan, EventVerificationHistory
from app.routes.admin import require_admin
from app.routes.events import unique_event_slug
from app.services.event_discovery import SOURCE_TYPES, TERRITORY, safe_url, scan_source

router = APIRouter(tags=["event discovery"])

def source_dict(row: EventSource, db: Session) -> dict:
    scans = db.query(EventSourceScan).filter_by(source_id=row.id)
    successes = scans.filter_by(status="success").count(); total = scans.count()
    return {"id": row.id, "name": row.name, "source_type": row.source_type, "base_url": row.base_url, "feed_url": row.feed_url, "state": row.state, "organizer_name": row.organizer_name, "is_active": row.is_active, "is_trusted": row.is_trusted, "scan_frequency": row.scan_frequency, "last_scanned_at": row.last_scanned_at, "last_success_at": row.last_success_at, "last_error": row.last_error, "consecutive_failures": row.consecutive_failures, "notes": row.notes, "candidate_count": db.query(EventCandidate).filter_by(source_id=row.id).count(), "scan_count": total, "success_rate": round(successes / total * 100, 1) if total else None}

def candidate_dict(row: EventCandidate) -> dict:
    return {column.name: getattr(row, column.name) for column in row.__table__.columns}

@router.get("/event-sources")
def list_sources(_: None = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict]:
    return [source_dict(row, db) for row in db.query(EventSource).order_by(EventSource.name).all()]

@router.post("/event-sources", status_code=201)
def create_source(payload: dict = Body(...), _: None = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    source_type = str(payload.get("source_type", "")); state = str(payload.get("state", "")).upper()
    if source_type not in SOURCE_TYPES: raise HTTPException(400, "Unsupported source type")
    if state not in TERRITORY: raise HTTPException(400, "Source state must be KY, WV, VA, TN, or NC")
    try: base_url = safe_url(str(payload.get("base_url", ""))); feed_url = safe_url(str(payload["feed_url"])) if payload.get("feed_url") else ""
    except ValueError as exc: raise HTTPException(400, str(exc)) from exc
    is_trusted = bool(payload.get("is_trusted", False)); is_active = bool(payload.get("is_active", False))
    if is_active and not is_trusted: raise HTTPException(400, "A source must be trusted before activation")
    row = EventSource(name=str(payload.get("name", "")).strip()[:180], source_type=source_type, base_url=base_url, feed_url=feed_url, state=state, organizer_name=str(payload.get("organizer_name", ""))[:180], is_active=is_active, is_trusted=is_trusted, scan_frequency=str(payload.get("scan_frequency", "twice_daily")), notes=str(payload.get("notes", "")))
    if not row.name: raise HTTPException(400, "Source name is required")
    db.add(row); db.commit(); db.refresh(row); return source_dict(row, db)

@router.patch("/event-sources/{source_id}")
def update_source(source_id: int, payload: dict = Body(...), _: None = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    row = db.get(EventSource, source_id)
    if not row: raise HTTPException(404, "Source not found")
    for field in ("name", "organizer_name", "scan_frequency", "notes", "is_active", "is_trusted"):
        if field in payload: setattr(row, field, payload[field])
    if payload.get("is_trusted") is False: row.is_active = False
    if row.is_active and not row.is_trusted: raise HTTPException(400, "A source must be trusted before activation")
    if "base_url" in payload: row.base_url = safe_url(str(payload["base_url"]))
    if "feed_url" in payload: row.feed_url = safe_url(str(payload["feed_url"])) if payload["feed_url"] else ""
    db.commit(); return source_dict(row, db)

@router.get("/event-candidates")
def list_candidates(candidate_status: str = Query("", alias="status"), _: None = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict]:
    query = db.query(EventCandidate)
    if candidate_status: query = query.filter(EventCandidate.status == candidate_status)
    return [candidate_dict(row) for row in query.order_by(EventCandidate.confidence_score.desc(), EventCandidate.first_seen_at.desc()).limit(300).all()]

@router.post("/event-discovery/run")
def run_discovery(source_id: int | None = None, state: str = "", max_sources: int = Query(20, ge=1, le=100), _: None = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    query = db.query(EventSource).filter(EventSource.is_active.is_(True), EventSource.is_trusted.is_(True))
    if source_id: query = query.filter(EventSource.id == source_id)
    if state: query = query.filter(EventSource.state == state.upper())
    sources = query.order_by(EventSource.last_scanned_at.asc().nullsfirst()).limit(max_sources).all(); results = []
    for source in sources:
        try:
            scan = scan_source(db, source); results.append({"source_id": source.id, "status": scan.status, "created": scan.candidates_created, "updated": scan.candidates_updated})
        except ValueError as exc: results.append({"source_id": source.id, "status": "locked", "error": str(exc)})
    return {"sources_scanned": len(results), "results": results}

@router.post("/event-candidates/{candidate_id}/review")
def review_candidate(candidate_id: int, payload: dict = Body(...), _: None = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    candidate = db.get(EventCandidate, candidate_id)
    if not candidate: raise HTTPException(404, "Candidate not found")
    action = str(payload.get("action", "")); candidate.admin_notes = str(payload.get("admin_notes", candidate.admin_notes)); candidate.reviewed_at = datetime.utcnow(); candidate.reviewed_by = str(payload.get("reviewed_by", "admin"))[:120]
    if action in {"reject", "ignore"}: candidate.status = "rejected" if action == "reject" else "ignored"; db.commit(); return candidate_dict(candidate)
    if action not in {"approve", "merge"}: raise HTTPException(400, "Action must be approve, merge, reject, or ignore")
    verified = bool(payload.get("is_verified", False))
    if not candidate.start_date or not candidate.end_date: raise HTTPException(400, "Candidate requires confirmed dates")
    if action == "approve":
        event = Event(title=candidate.title, slug=unique_event_slug(db, candidate.title, candidate.start_date), organizer=candidate.organizer, description=candidate.description or "See the official source for event details.", state=candidate.state, city=candidate.city, venue=candidate.venue, address=candidate.address, latitude=candidate.latitude, longitude=candidate.longitude, start_date=candidate.start_date, end_date=candidate.end_date, category=candidate.category, vehicle_types=candidate.vehicle_types, official_url=candidate.official_url, registration_url=candidate.registration_url, facebook_url=candidate.facebook_url, image_url=candidate.image_url, verification_source=candidate.source_url, is_verified=verified, verified_at=datetime.utcnow() if verified else None, status="approved", is_featured=False)
        db.add(event); db.flush(); previous = {}
    else:
        event_id = int(payload.get("event_id") or candidate.duplicate_event_id or 0); event = db.get(Event, event_id)
        if not event: raise HTTPException(404, "Merge event not found")
        fields = payload.get("fields") or ["title", "organizer", "description", "state", "city", "venue", "address", "start_date", "end_date", "official_url", "registration_url"]
        previous = {field: str(getattr(event, field)) for field in fields if hasattr(event, field)}
        for field in fields:
            if hasattr(candidate, field) and hasattr(event, field): setattr(event, field, getattr(candidate, field))
        event.verification_source = candidate.source_url; event.last_checked_at = datetime.utcnow()
        if verified: event.is_verified = True; event.verified_at = datetime.utcnow()
    candidate.status = "approved"; candidate.duplicate_event_id = event.id
    new_values = {field: str(getattr(event, field)) for field in ("title", "start_date", "end_date", "venue", "official_url", "is_verified")}
    db.add(EventVerificationHistory(event_id=event.id, candidate_id=candidate.id, source_url=candidate.source_url, admin_name=candidate.reviewed_by, action=action, previous_values=previous, new_values=new_values)); db.commit(); db.refresh(event)
    return {"candidate": candidate_dict(candidate), "event_id": event.id, "event_slug": event.slug, "is_verified": event.is_verified}

@router.get("/events-intelligence")
def intelligence(_: None = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    today = date.today()
    return {"new_candidates": db.query(EventCandidate).filter(EventCandidate.status.in_(["new", "needs_review"])).count(), "high_confidence": db.query(EventCandidate).filter(EventCandidate.confidence_score >= 75, EventCandidate.status.in_(["new", "needs_review"])).count(), "possible_duplicates": db.query(EventCandidate).filter_by(status="possible_duplicate").count(), "possible_updates": db.query(EventCandidate).filter_by(status="possible_update").count(), "source_failures": db.query(EventSource).filter(EventSource.consecutive_failures > 0).count(), "needs_reverification": db.query(Event).filter(Event.reverify_after <= datetime.utcnow()).count(), "starting_within_30_days": db.query(Event).filter(Event.status == "approved", Event.start_date.between(today, date.fromordinal(today.toordinal() + 30))).count()}
