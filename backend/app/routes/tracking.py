import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db, get_settings
from app.models import (RiderCircle, RiderCircleMember, TrackingAlert, TrackingCheckpoint,
    TrackingEmergencyContact, TrackingLocationUpdate, TrackingMessage, TrackingSession,
    TrackingViewAudit)
from app.routes.riders import require_rider_access
from app.services.rider_safety import deliver_alert, last_location_text

router = APIRouter(tags=["rider-safety"])
MESSAGE_TEXT = {
    "ok": "I'm OK",
    "delayed": "I'm delayed",
    "help": "I need help — contact me",
    "returning": "I'm heading back",
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def active_session(db: Session, session_id: int, rider_id: int) -> TrackingSession:
    session = db.query(TrackingSession).filter_by(id=session_id, rider_id=rider_id).first()
    if not session:
        raise HTTPException(404, "Tracking session not found")
    if session.status != "active" or session.ended_at or aware(session.expires_at) <= utcnow():
        raise HTTPException(409, "Tracking session has ended")
    return session


def viewer_session(db: Session, token: str) -> TrackingSession:
    session = db.query(TrackingSession).filter_by(share_token_hash=token_hash(token)).first()
    if not session:
        raise HTTPException(404, "Shared ride not found")
    return session


class SessionCreate(BaseModel):
    title: str = Field(default="Off-road ride", min_length=1, max_length=180)
    expected_return_at: datetime
    consent: bool


class LocationCreate(BaseModel):
    sequence: str = Field(min_length=1, max_length=80)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy_meters: float | None = Field(default=None, ge=0, le=100000)
    heading: float | None = Field(default=None, ge=0, le=360)
    speed_mps: float | None = Field(default=None, ge=0, le=200)
    battery_percent: int | None = Field(default=None, ge=0, le=100)
    device_recorded_at: datetime


class MessageCreate(BaseModel):
    message_type: str


class CircleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class CircleInviteCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(default="", max_length=180)
    phone: str = Field(default="", max_length=40)


class ContactCreate(CircleInviteCreate):
    sms_opt_in: bool = False
    email_opt_in: bool = True


class CheckpointCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    due_at: datetime
    grace_minutes: int = Field(default=15, ge=5, le=120)


class SosCreate(BaseModel):
    confirmed: bool


def session_json(session: TrackingSession, share_token: str = "") -> dict:
    result = {
        "id": session.id, "title": session.title, "status": session.status,
        "expected_return_at": aware(session.expected_return_at).isoformat(),
        "expires_at": aware(session.expires_at).isoformat(),
        "ended_at": aware(session.ended_at).isoformat() if session.ended_at else None,
    }
    if share_token:
        result["share_url"] = f"{get_settings().frontend_url}/safety/{share_token}"
    return result


@router.post("/rider-safety/sessions")
def create_session(payload: SessionCreate, db: Session = Depends(get_db), rider=Depends(require_rider_access)) -> dict:
    if not payload.consent:
        raise HTTPException(422, "Location-sharing consent is required")
    expected = aware(payload.expected_return_at)
    if expected <= utcnow() + timedelta(minutes=5) or expected > utcnow() + timedelta(days=7):
        raise HTTPException(422, "Expected return must be between 5 minutes and 7 days from now")
    db.query(TrackingSession).filter_by(rider_id=rider.id, status="active").update(
        {"status": "ended", "ended_at": utcnow()}, synchronize_session=False
    )
    raw_token = secrets.token_urlsafe(32)
    session = TrackingSession(rider_id=rider.id, title=payload.title.strip(), expected_return_at=expected,
        expires_at=expected + timedelta(hours=2), share_token_hash=token_hash(raw_token))
    db.add(session); db.flush()
    db.add(TrackingCheckpoint(session_id=session.id, name="Expected ride return", due_at=expected, grace_minutes=15))
    db.commit(); db.refresh(session)
    return session_json(session, raw_token)


@router.get("/rider-safety/sessions/active")
def get_active(db: Session = Depends(get_db), rider=Depends(require_rider_access)) -> dict | None:
    session = db.query(TrackingSession).filter_by(rider_id=rider.id, status="active").order_by(TrackingSession.id.desc()).first()
    if not session or aware(session.expires_at) <= utcnow():
        return None
    return session_json(session)


@router.post("/rider-safety/sessions/{session_id}/locations")
def add_location(session_id: int, payload: LocationCreate, db: Session = Depends(get_db), rider=Depends(require_rider_access)) -> dict:
    active_session(db, session_id, rider.id)
    location = TrackingLocationUpdate(session_id=session_id, **payload.model_dump())
    db.add(location)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"received": True, "duplicate": True}
    return {"received": True, "server_received_at": aware(location.server_received_at).isoformat()}


@router.post("/rider-safety/sessions/{session_id}/messages")
def add_message(session_id: int, payload: MessageCreate, db: Session = Depends(get_db), rider=Depends(require_rider_access)) -> dict:
    active_session(db, session_id, rider.id)
    if payload.message_type not in MESSAGE_TEXT:
        raise HTTPException(422, "Unknown safety message")
    message = TrackingMessage(session_id=session_id, message_type=payload.message_type, text=MESSAGE_TEXT[payload.message_type])
    db.add(message); db.commit(); db.refresh(message)
    return {"id": message.id, "text": message.text, "created_at": aware(message.created_at).isoformat()}


@router.post("/rider-safety/sessions/{session_id}/stop")
def stop_session(session_id: int, db: Session = Depends(get_db), rider=Depends(require_rider_access)) -> dict:
    session = active_session(db, session_id, rider.id)
    session.status = "ended"; session.ended_at = utcnow(); db.commit()
    return session_json(session)


@router.delete("/rider-safety/sessions/{session_id}/location-data")
def delete_location_data(session_id: int, db: Session = Depends(get_db), rider=Depends(require_rider_access)) -> dict:
    session = db.query(TrackingSession).filter_by(id=session_id, rider_id=rider.id).first()
    if not session: raise HTTPException(404, "Tracking session not found")
    deleted = db.query(TrackingLocationUpdate).filter_by(session_id=session.id).delete(synchronize_session=False)
    session.status = "ended"; session.ended_at = session.ended_at or utcnow(); db.commit()
    return {"deleted_locations": deleted, "sharing_revoked": True}


@router.get("/rider-safety/circles")
def list_circles(db: Session = Depends(get_db), rider=Depends(require_rider_access)) -> list[dict]:
    circles = db.query(RiderCircle).filter_by(rider_id=rider.id).all()
    return [{"id": circle.id, "name": circle.name, "members": [{"id": member.id, "name": member.name, "email": member.email, "phone": member.phone, "status": member.status} for member in db.query(RiderCircleMember).filter_by(circle_id=circle.id).all()]} for circle in circles]


@router.post("/rider-safety/circles")
def create_circle(payload: CircleCreate, db: Session = Depends(get_db), rider=Depends(require_rider_access)) -> dict:
    circle = RiderCircle(rider_id=rider.id, name=payload.name.strip()); db.add(circle); db.commit(); db.refresh(circle)
    return {"id": circle.id, "name": circle.name, "members": []}


@router.post("/rider-safety/circles/{circle_id}/invites")
def invite_member(circle_id: int, payload: CircleInviteCreate, db: Session = Depends(get_db), rider=Depends(require_rider_access)) -> dict:
    circle = db.query(RiderCircle).filter_by(id=circle_id, rider_id=rider.id).first()
    if not circle: raise HTTPException(404, "Circle not found")
    if not payload.email.strip() and not payload.phone.strip(): raise HTTPException(422, "Email or phone is required")
    raw = secrets.token_urlsafe(32)
    member = RiderCircleMember(circle_id=circle.id, name=payload.name.strip(), email=payload.email.strip().lower(), phone=payload.phone.strip(), invite_token_hash=token_hash(raw), invite_expires_at=utcnow() + timedelta(days=7))
    db.add(member); db.commit(); db.refresh(member)
    return {"id": member.id, "status": member.status, "invite_url": f"{get_settings().frontend_url}/safety/invite/{raw}"}


@router.post("/rider-safety/invites/{token}/accept")
def accept_invite(token: str, db: Session = Depends(get_db)) -> dict:
    member = db.query(RiderCircleMember).filter_by(invite_token_hash=token_hash(token), status="invited").first()
    if not member or not member.invite_expires_at or aware(member.invite_expires_at) <= utcnow(): raise HTTPException(404, "Invitation is invalid or expired")
    member.status = "accepted"; member.accepted_at = utcnow(); member.invite_token_hash = None; db.commit()
    return {"accepted": True, "name": member.name}


@router.get("/rider-safety/contacts")
def list_contacts(db: Session = Depends(get_db), rider=Depends(require_rider_access)) -> list[dict]:
    return [{"id": item.id, "name": item.name, "email": item.email, "phone": item.phone, "sms_opt_in": item.sms_opt_in, "email_opt_in": item.email_opt_in} for item in db.query(TrackingEmergencyContact).filter_by(rider_id=rider.id).all()]


@router.post("/rider-safety/contacts")
def create_contact(payload: ContactCreate, db: Session = Depends(get_db), rider=Depends(require_rider_access)) -> dict:
    if not payload.email.strip() and not payload.phone.strip(): raise HTTPException(422, "Email or phone is required")
    if payload.sms_opt_in and not payload.phone.strip(): raise HTTPException(422, "A phone number is required for SMS")
    item = TrackingEmergencyContact(rider_id=rider.id, name=payload.name.strip(), email=payload.email.strip().lower(), phone=payload.phone.strip(), sms_opt_in=payload.sms_opt_in, email_opt_in=payload.email_opt_in)
    db.add(item); db.commit(); db.refresh(item)
    return {"id": item.id, "name": item.name}


@router.delete("/rider-safety/contacts/{contact_id}")
def delete_contact(contact_id: int, db: Session = Depends(get_db), rider=Depends(require_rider_access)) -> dict:
    item = db.query(TrackingEmergencyContact).filter_by(id=contact_id, rider_id=rider.id).first()
    if not item: raise HTTPException(404, "Contact not found")
    from app.models import TrackingNotificationDelivery
    db.query(TrackingNotificationDelivery).filter_by(contact_id=item.id).update({"contact_id": None}, synchronize_session=False)
    db.delete(item); db.commit(); return {"deleted": True}


@router.post("/rider-safety/sessions/{session_id}/checkpoints")
def create_checkpoint(session_id: int, payload: CheckpointCreate, db: Session = Depends(get_db), rider=Depends(require_rider_access)) -> dict:
    active_session(db, session_id, rider.id); due = aware(payload.due_at)
    if due <= utcnow() or due > utcnow() + timedelta(days=7): raise HTTPException(422, "Checkpoint must be in the next 7 days")
    item = TrackingCheckpoint(session_id=session_id, name=payload.name.strip(), due_at=due, grace_minutes=payload.grace_minutes)
    db.add(item); db.commit(); db.refresh(item)
    return {"id": item.id, "name": item.name, "due_at": aware(item.due_at).isoformat(), "grace_minutes": item.grace_minutes}


@router.post("/rider-safety/sessions/{session_id}/checkpoints/{checkpoint_id}/arrive")
def arrive_checkpoint(session_id: int, checkpoint_id: int, db: Session = Depends(get_db), rider=Depends(require_rider_access)) -> dict:
    active_session(db, session_id, rider.id); item = db.query(TrackingCheckpoint).filter_by(id=checkpoint_id, session_id=session_id).first()
    if not item: raise HTTPException(404, "Checkpoint not found")
    item.arrived_at = utcnow(); item.alert_status = "arrived"; db.commit(); return {"arrived": True, "arrived_at": aware(item.arrived_at).isoformat()}


@router.post("/rider-safety/sessions/{session_id}/sos")
def send_sos(session_id: int, payload: SosCreate, db: Session = Depends(get_db), rider=Depends(require_rider_access)) -> dict:
    session = active_session(db, session_id, rider.id)
    if not payload.confirmed: raise HTTPException(422, "SOS confirmation is required")
    recent = db.query(TrackingAlert).filter(TrackingAlert.session_id == session.id, TrackingAlert.alert_type == "sos", TrackingAlert.created_at >= utcnow() - timedelta(minutes=5)).first()
    if recent: raise HTTPException(429, "An SOS was already submitted in the last 5 minutes")
    alert = TrackingAlert(session_id=session.id, checkpoint_id=None, alert_type="sos"); db.add(alert); db.commit(); db.refresh(alert)
    body = f"{rider.display_name} pressed SOS and asked trusted contacts for help. {last_location_text(db, session.id)}"
    delivered = deliver_alert(db, alert, "Rider SOS — contact rider and call emergency services if needed", body)
    db.add(TrackingMessage(session_id=session.id, message_type="sos", text="SOS sent to configured contacts")); db.commit()
    return {"alert_id": alert.id, "deliveries_sent": delivered, "delivery_status": alert.status, "emergency_services_contacted": False}


@router.get("/rider-safety/shared/{token}")
def shared_session(token: str, db: Session = Depends(get_db)) -> dict:
    session = viewer_session(db, token)
    now = utcnow()
    if session.status == "active" and aware(session.expires_at) <= now:
        session.status = "expired"; db.commit()
    sharing_active = session.status == "active" and not session.ended_at
    location = None
    messages = []
    if sharing_active:
        location = db.query(TrackingLocationUpdate).filter_by(session_id=session.id).order_by(TrackingLocationUpdate.server_received_at.desc()).first()
        messages = db.query(TrackingMessage).filter_by(session_id=session.id).order_by(TrackingMessage.created_at.desc()).limit(10).all()
    checkpoints = db.query(TrackingCheckpoint).filter_by(session_id=session.id).order_by(TrackingCheckpoint.due_at).all() if sharing_active else []
    db.add(TrackingViewAudit(session_id=session.id)); db.commit()
    age = (now - aware(location.server_received_at)).total_seconds() if location else None
    freshness = "waiting"
    if age is not None:
        freshness = "live" if age <= 60 else "recent" if age <= 300 else "delayed" if age <= 900 else "offline"
    return {
        **session_json(session), "rider_name": session.rider.display_name, "freshness": freshness,
        "last_location": None if not location else {
            "latitude": location.latitude, "longitude": location.longitude, "accuracy_meters": location.accuracy_meters,
            "heading": location.heading, "speed_mps": location.speed_mps, "battery_percent": location.battery_percent,
            "server_received_at": aware(location.server_received_at).isoformat(),
        },
        "messages": [{"id": item.id, "type": item.message_type, "text": item.text, "created_at": aware(item.created_at).isoformat()} for item in messages],
        "checkpoints": [{"id": item.id, "name": item.name, "due_at": aware(item.due_at).isoformat(), "arrived_at": aware(item.arrived_at).isoformat() if item.arrived_at else None, "status": item.alert_status} for item in checkpoints],
    }
