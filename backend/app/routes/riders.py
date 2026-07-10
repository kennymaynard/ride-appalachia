import secrets
import re
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.database import get_db, get_settings
from app.models import (
    Business,
    BusinessReview,
    PartnerVisit,
    Rider,
    RiderBadge,
    RiderTrailProgress,
)
from app.services.passcodes import hash_passcode, verify_passcode
from app.services.email_service import send_rider_password_reset_email
from app.services.sms_service import send_sms
from app.schemas import (
    BusinessReviewCreate,
    BusinessReviewRead,
    PartnerVisitCreate,
    PartnerVisitRead,
    RiderAlertPreferencesUpdate,
    RiderLoginRead,
    RiderLoginRequest,
    RiderPasswordResetConfirm,
    RiderPasswordResetRequest,
    RiderRead,
    RiderRideCardRead,
    RiderTrailProgressCreate,
    RiderTrailProgressRead,
    VeteranVerificationRequest,
)

router = APIRouter(tags=["riders"])


TRAIL_BADGE_MILESTONES = (1, 5, 10, 25, 50, 100)
ACTIVITY_BADGE_MILESTONES = (1, 5, 10, 25)
PARTNER_BADGE_MILESTONES = (1, 5, 10, 25)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def require_rider_access(
    x_rider_token: str = Header(default=""),
    db: Session = Depends(get_db),
) -> Rider:
    rider = (
        db.query(Rider)
        .options(selectinload(Rider.badges), selectinload(Rider.progress))
        .filter(Rider.access_token == x_rider_token)
        .first()
    )
    if not rider:
        raise HTTPException(status_code=401, detail="Rider access token required")
    return rider


def issue_badge(db: Session, rider: Rider, badge_key: str, label: str, category: str) -> None:
    exists = (
        db.query(RiderBadge)
        .filter(RiderBadge.rider_id == rider.id, RiderBadge.badge_key == badge_key)
        .first()
    )
    if exists:
        return

    db.add(
        RiderBadge(
            rider_id=rider.id,
            badge_key=badge_key,
            label=label,
            category=category,
        )
    )


def award_progress_badges(db: Session, rider: Rider) -> None:
    completed = (
        db.query(RiderTrailProgress)
        .filter(RiderTrailProgress.rider_id == rider.id, RiderTrailProgress.status == "completed")
        .all()
    )
    total_completed = len(completed)
    for milestone in TRAIL_BADGE_MILESTONES:
        if total_completed >= milestone:
            issue_badge(db, rider, f"trail_{milestone}", f"{milestone} Trail Finisher", "trail")

    for activity in ("hiking", "run", "walk"):
        activity_count = len([item for item in completed if item.activity == activity])
        for milestone in ACTIVITY_BADGE_MILESTONES:
            if activity_count >= milestone:
                label_activity = {"hiking": "Hike", "run": "Run", "walk": "Walk"}[activity]
                issue_badge(
                    db,
                    rider,
                    f"{activity}_{milestone}",
                    f"{milestone} {label_activity} Badge",
                    activity,
                )

    group_rides = len([item for item in completed if item.is_group_ride])
    if group_rides >= 1:
        issue_badge(db, rider, "group_ride_1", "Group Ride Starter", "community")
    if group_rides >= 5:
        issue_badge(db, rider, "group_ride_5", "Group Ride Regular", "community")


def award_partner_visit_badges(db: Session, rider: Rider) -> None:
    visit_count = db.query(PartnerVisit).filter(PartnerVisit.rider_id == rider.id).count()
    for milestone in PARTNER_BADGE_MILESTONES:
        if visit_count >= milestone:
            issue_badge(
                db,
                rider,
                f"partner_visit_{milestone}",
                f"{milestone} Partner Visit Badge",
                "partner",
            )


@router.post("/riders/password-reset/request")
def request_rider_password_reset(
    payload: RiderPasswordResetRequest,
    db: Session = Depends(get_db),
) -> dict[str, str | bool]:
    email = normalize_email(payload.email)
    rider = db.query(Rider).filter(Rider.email == email).first()
    sent = False
    message = "If a rider account exists for that email, a reset link has been sent."
    reset_url = ""

    if rider:
        if not rider.access_token:
            rider.access_token = secrets.token_urlsafe(24)
            db.commit()
            db.refresh(rider)

        reset_url = f"{get_settings().frontend_url}/rider/login?reset_token={rider.access_token}"
        result = send_rider_password_reset_email(rider.email, rider.display_name, reset_url)
        sent = result.sent
        if not result.sent and "Development reset link returned" in result.message:
            message = result.message

    return {
        "sent": sent,
        "message": message,
        "reset_url": reset_url if message.startswith("Email is not configured") else "",
    }


@router.post("/riders/password-reset/confirm", response_model=RiderLoginRead)
def confirm_rider_password_reset(
    payload: RiderPasswordResetConfirm,
    db: Session = Depends(get_db),
) -> RiderLoginRead:
    rider = db.query(Rider).filter(Rider.access_token == payload.reset_token.strip()).first()
    if not rider:
        raise HTTPException(status_code=401, detail="Password reset link is invalid")

    rider.password_hash = hash_passcode(payload.password.strip())
    if not rider.access_token:
        rider.access_token = secrets.token_urlsafe(24)
    db.commit()
    db.refresh(rider)

    access_path = f"/rider/access/{rider.access_token}"
    return RiderLoginRead(
        access_url=access_path,
        access_token=rider.access_token,
        message="Rider password reset.",
    )


@router.post("/riders/login", response_model=RiderLoginRead)
def login_rider(payload: RiderLoginRequest, db: Session = Depends(get_db)) -> RiderLoginRead:
    email = normalize_email(payload.email)
    password = payload.password.strip()
    rider = db.query(Rider).filter(Rider.email == email).first()
    if not rider:
        display_name = payload.display_name.strip() or email.split("@")[0]
        rider = Rider(
            display_name=display_name[:120],
            email=email,
            phone=payload.phone.strip(),
            password_hash=hash_passcode(password),
            home_location=payload.home_location.strip()[:180],
            home_latitude=payload.home_latitude,
            home_longitude=payload.home_longitude,
            access_token=secrets.token_urlsafe(24),
        )
        db.add(rider)
        db.commit()
        db.refresh(rider)
    else:
        if rider.password_hash:
            if not verify_passcode(password, rider.password_hash):
                raise HTTPException(status_code=401, detail="Invalid rider password")
        elif re.sub(r"\D+", "", rider.phone)[-4:] == password:
            rider.password_hash = hash_passcode(password)
        else:
            raise HTTPException(
                status_code=401,
                detail="Invalid rider password. Existing rider profiles can use the last 4 digits of the profile phone number once to set it.",
            )
        if payload.display_name.strip():
            rider.display_name = payload.display_name.strip()[:120]
        if payload.phone.strip():
            rider.phone = payload.phone.strip()
        if payload.home_location.strip():
            rider.home_location = payload.home_location.strip()[:180]
        if payload.home_latitude is not None and payload.home_longitude is not None:
            rider.home_latitude = payload.home_latitude
            rider.home_longitude = payload.home_longitude
        if not rider.access_token:
            rider.access_token = secrets.token_urlsafe(24)
        db.commit()
        db.refresh(rider)

    settings = get_settings()
    access_path = f"/rider/access/{rider.access_token}"
    return RiderLoginRead(
        access_url=access_path,
        access_token=rider.access_token,
        message=f"Rider profile ready at {settings.frontend_url}{access_path}",
    )


@router.get("/riders/me", response_model=RiderRead)
def get_rider_profile(rider: Rider = Depends(require_rider_access)) -> Rider:
    return rider


@router.patch("/riders/me/alerts", response_model=RiderRead)
def update_rider_alert_preferences(
    payload: RiderAlertPreferencesUpdate,
    rider: Rider = Depends(require_rider_access),
    db: Session = Depends(get_db),
) -> Rider:
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(rider, key, value)
    db.commit()
    db.refresh(rider)
    if rider.phone and rider.alert_phone_opt_in:
        send_sms(
            rider.phone,
            "Appalachia Offroad rider SMS alerts are on. Reply STOP to opt out.",
        )
    return rider


@router.post("/riders/progress", response_model=RiderTrailProgressRead)
def save_rider_progress(
    payload: RiderTrailProgressCreate,
    rider: Rider = Depends(require_rider_access),
    db: Session = Depends(get_db),
) -> RiderTrailProgress:
    progress = (
        db.query(RiderTrailProgress)
        .filter(
            RiderTrailProgress.rider_id == rider.id,
            RiderTrailProgress.area_slug == payload.area_slug,
            RiderTrailProgress.trail_name == payload.trail_name,
        )
        .first()
    )
    if payload.status == "completed" and (
        not progress or progress.source not in {"checked_in", "tracked"}
    ):
        raise HTTPException(
            status_code=400,
            detail="Check in and start tracking this trail before marking it complete.",
        )
    if payload.status == "completed" and payload.source != "tracked":
        raise HTTPException(
            status_code=400,
            detail="Tracked completion is required before badges are awarded.",
        )
    if not progress:
        progress = RiderTrailProgress(rider_id=rider.id, **payload.model_dump())
        db.add(progress)
    else:
        for key, value in payload.model_dump().items():
            setattr(progress, key, value)

    if payload.status == "completed" and progress.completed_at is None:
        progress.completed_at = datetime.utcnow()

    db.flush()
    award_progress_badges(db, rider)
    db.commit()
    db.refresh(progress)
    return progress


@router.post("/riders/veteran-verification", response_model=RiderRead)
def request_veteran_verification(
    payload: VeteranVerificationRequest,
    rider: Rider = Depends(require_rider_access),
    db: Session = Depends(get_db),
) -> Rider:
    rider.veteran_verification_status = "pending"
    rider.veteran_document_name = payload.document_name.strip()[:220]
    rider.veteran_verification_notes = payload.notes.strip()
    db.commit()
    db.refresh(rider)
    return rider


@router.post("/riders/partner-visits", response_model=PartnerVisitRead)
def create_partner_visit(
    payload: PartnerVisitCreate,
    rider: Rider = Depends(require_rider_access),
    db: Session = Depends(get_db),
) -> PartnerVisit:
    business = db.get(Business, payload.business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    visit = PartnerVisit(rider_id=rider.id, **payload.model_dump())
    db.add(visit)
    db.flush()
    award_partner_visit_badges(db, rider)
    db.commit()
    db.refresh(visit)
    return visit


@router.get("/riders/ride-card", response_model=RiderRideCardRead)
def get_ride_card(
    rider: Rider = Depends(require_rider_access),
    db: Session = Depends(get_db),
) -> RiderRideCardRead:
    completed = (
        db.query(RiderTrailProgress)
        .filter(RiderTrailProgress.rider_id == rider.id, RiderTrailProgress.status == "completed")
        .all()
    )
    partner_visits = db.query(PartnerVisit).filter(PartnerVisit.rider_id == rider.id).count()
    db.refresh(rider)
    return RiderRideCardRead(
        rider=rider,
        completed_trails=len(completed),
        completed_hikes=len([item for item in completed if item.activity == "hiking"]),
        completed_runs=len([item for item in completed if item.activity == "run"]),
        completed_walks=len([item for item in completed if item.activity == "walk"]),
        partner_visits=partner_visits,
        badges=rider.badges,
    )


@router.post("/business-reviews", response_model=BusinessReviewRead)
def create_business_review(
    payload: BusinessReviewCreate,
    x_rider_token: str = Header(default=""),
    db: Session = Depends(get_db),
) -> BusinessReview:
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    business = db.get(Business, payload.business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    rider = db.query(Rider).filter(Rider.access_token == x_rider_token).first() if x_rider_token else None
    review = BusinessReview(
        **payload.model_dump(),
        rider_id=rider.id if rider else None,
        status="pending",
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review
