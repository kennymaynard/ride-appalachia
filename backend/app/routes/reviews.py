from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import TrailReview
from app.routes.admin import require_admin
from app.schemas import TrailReviewCreate, TrailReviewModerationUpdate, TrailReviewRead

router = APIRouter(tags=["trail reviews"])


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

    review = TrailReview(
        **payload.model_dump(),
        status="pending",
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


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
