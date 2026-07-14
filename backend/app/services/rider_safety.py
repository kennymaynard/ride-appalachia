from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import (TrackingAlert, TrackingCheckpoint, TrackingEmergencyContact,
    TrackingLocationUpdate, TrackingMessage, TrackingNotificationDelivery, TrackingSession)
from app.services.email_service import send_safety_email
from app.services.sms_service import send_sms


def aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def last_location_text(db: Session, session_id: int) -> str:
    item = db.query(TrackingLocationUpdate).filter_by(session_id=session_id).order_by(TrackingLocationUpdate.server_received_at.desc()).first()
    if not item:
        return "No location has been received."
    return f"Last known coordinates: {item.latitude:.6f}, {item.longitude:.6f}. Received {aware(item.server_received_at).isoformat()}."


def deliver_alert(db: Session, alert: TrackingAlert, subject: str, body: str) -> int:
    session = db.query(TrackingSession).filter_by(id=alert.session_id).first()
    contacts = db.query(TrackingEmergencyContact).filter_by(rider_id=session.rider_id).all() if session else []
    sent = 0
    for contact in contacts:
        if contact.sms_opt_in and contact.phone:
            result = send_sms(contact.phone, f"Appalachia Offroad safety alert: {body} This is not an emergency service.")
            db.add(TrackingNotificationDelivery(alert_id=alert.id, contact_id=contact.id, channel="sms", destination=contact.phone, status="sent" if result.sent else "failed", provider_message=result.message))
            sent += int(result.sent)
        if contact.email_opt_in and contact.email:
            result = send_safety_email(contact.email, subject, f"{body}\n\nThis is a best-effort notification, not an emergency-service dispatch.")
            db.add(TrackingNotificationDelivery(alert_id=alert.id, contact_id=contact.id, channel="email", destination=contact.email, status="sent" if result.sent else "failed", provider_message=result.message))
            sent += int(result.sent)
    alert.status = "sent" if sent else "delivery_failed"
    db.commit()
    return sent


def process_due_checkpoints(db: Session) -> int:
    now = datetime.now(timezone.utc)
    candidates = db.query(TrackingCheckpoint).filter(TrackingCheckpoint.alert_status.in_(("scheduled", "grace"))).all()
    processed = 0
    for checkpoint in candidates:
        if checkpoint.arrived_at:
            continue
        if aware(checkpoint.due_at) <= now and checkpoint.alert_status == "scheduled":
            db.add(TrackingMessage(session_id=checkpoint.session_id, message_type="checkin_due", text=f"Check in now: {checkpoint.name}"))
            checkpoint.alert_status = "grace"; db.commit()
        if aware(checkpoint.due_at) + timedelta(minutes=checkpoint.grace_minutes) > now:
            continue
        session = db.query(TrackingSession).filter_by(id=checkpoint.session_id).first()
        if not session or session.status != "active":
            checkpoint.alert_status = "canceled"
            continue
        alert = TrackingAlert(session_id=session.id, checkpoint_id=checkpoint.id, alert_type="missed_checkin")
        db.add(alert)
        try:
            db.commit(); db.refresh(alert)
        except Exception:
            db.rollback(); checkpoint.alert_status = "processed"; db.commit(); continue
        checkpoint.alert_status = "processed"; db.commit()
        body = f"{session.rider.display_name} missed the checkpoint '{checkpoint.name}'. {last_location_text(db, session.id)}"
        deliver_alert(db, alert, "Missed rider check-in", body); processed += 1
    db.commit()
    return processed


def purge_expired_locations(db: Session, retention_hours: int = 72) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=retention_hours)
    deleted = db.query(TrackingLocationUpdate).filter(TrackingLocationUpdate.server_received_at < cutoff).delete(synchronize_session=False)
    db.commit()
    return deleted
