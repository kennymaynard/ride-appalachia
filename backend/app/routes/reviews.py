from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from urllib.parse import urlparse

from app.database import get_db
from app.models import TrailConditionReport, TrailReview
from app.routes.admin import require_admin
from app.schemas import (
    TrailConditionReportCreate,
    TrailConditionReportModerationUpdate,
    TrailConditionReportRead,
    TrailReviewCreate,
    TrailReviewModerationUpdate,
    TrailReviewRead,
)

router = APIRouter(tags=["trail reviews"])

CONDITION_REPORT_TYPES = {
    "muddy",
    "dusty",
    "closed",
    "washed_out",
    "downed_tree",
    "weak_cell",
    "trailer_warning",
    "crowded",
    "clear",
}
CONDITION_SEVERITIES = {"low", "moderate", "high", "closed"}


def is_valid_review_photo(photo_url: str) -> bool:
    if not photo_url:
        return True
    if photo_url.startswith("data:image/"):
        return len(photo_url) <= 1_500_000

    parsed_url = urlparse(photo_url.strip())
    if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
        return False

    return parsed_url.path.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif"))


@router.get("/trail-reviews", response_model=list[TrailReviewRead])
def list_trail_reviews(
    area_slug: str = Query(default=""),
    status: str = Query(default="approved"),
    db: Session = Depends(get_db),
) -> list[TrailReview]:
    query = db.query(TrailReview)
    if area_slug:
        query = query.filter(TrailReview.area_slug == area_slug)
    if status != "all":
        query = query.filter(TrailReview.status == status)
    return query.order_by(TrailReview.created_at.desc()).all()


@router.post("/trail-reviews", response_model=TrailReviewRead)
def create_trail_review(
    payload: TrailReviewCreate,
    db: Session = Depends(get_db),
) -> TrailReview:
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    if not is_valid_review_photo(payload.photo_url):
        raise HTTPException(status_code=400, detail="Use a direct image URL or upload a smaller image")

    review = TrailReview(
        **payload.model_dump(),
        status="pending",
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.get("/trail-condition-reports", response_model=list[TrailConditionReportRead])
def list_trail_condition_reports(
    area_slug: str = Query(default=""),
    status: str = Query(default="approved"),
    db: Session = Depends(get_db),
) -> list[TrailConditionReport]:
    query = db.query(TrailConditionReport)
    if area_slug:
        query = query.filter(TrailConditionReport.area_slug == area_slug)
    if status != "all":
        query = query.filter(TrailConditionReport.status == status)
    return query.order_by(TrailConditionReport.created_at.desc()).all()


@router.post("/trail-condition-reports", response_model=TrailConditionReportRead)
def create_trail_condition_report(
    payload: TrailConditionReportCreate,
    db: Session = Depends(get_db),
) -> TrailConditionReport:
    report_type = payload.report_type.strip().lower()
    severity = payload.severity.strip().lower()
    if report_type not in CONDITION_REPORT_TYPES:
        raise HTTPException(status_code=400, detail="Unknown condition report type")
    if severity not in CONDITION_SEVERITIES:
        raise HTTPException(status_code=400, detail="Unknown condition severity")

    report = TrailConditionReport(
        **payload.model_dump(exclude={"report_type", "severity"}),
        report_type=report_type,
        severity=severity,
        status="pending",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/admin/trail-reviews", response_model=list[TrailReviewRead])
def list_admin_trail_reviews(
    _: None = Depends(require_admin),
    status: str = Query(default="pending"),
    db: Session = Depends(get_db),
) -> list[TrailReview]:
    query = db.query(TrailReview)
    if status != "all":
        query = query.filter(TrailReview.status == status)
    return query.order_by(TrailReview.created_at.desc()).all()


@router.post("/admin/trail-reviews/{review_id}/moderate", response_model=TrailReviewRead)
def moderate_trail_review(
    review_id: int,
    payload: TrailReviewModerationUpdate,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TrailReview:
    allowed_statuses = {"pending", "approved", "rejected"}
    if payload.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Unknown review status")

    review = db.get(TrailReview, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    review.status = payload.status
    db.commit()
    db.refresh(review)
    return review


@router.get("/admin/trail-condition-reports", response_model=list[TrailConditionReportRead])
def list_admin_trail_condition_reports(
    _: None = Depends(require_admin),
    status: str = Query(default="pending"),
    db: Session = Depends(get_db),
) -> list[TrailConditionReport]:
    query = db.query(TrailConditionReport)
    if status != "all":
        query = query.filter(TrailConditionReport.status == status)
    return query.order_by(TrailConditionReport.created_at.desc()).all()


@router.post(
    "/admin/trail-condition-reports/{report_id}/moderate",
    response_model=TrailConditionReportRead,
)
def moderate_trail_condition_report(
    report_id: int,
    payload: TrailConditionReportModerationUpdate,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TrailConditionReport:
    allowed_statuses = {"pending", "approved", "rejected"}
    if payload.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Unknown report status")

    report = db.get(TrailConditionReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Condition report not found")

    report.status = payload.status
    db.commit()
    db.refresh(report)
    return report
