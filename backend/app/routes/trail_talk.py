from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import TrailTalkPost
from app.routes.admin import require_admin
from app.schemas import (
    TrailTalkModerationUpdate,
    TrailTalkPostAdminRead,
    TrailTalkPostCreate,
    TrailTalkPostRead,
)

router = APIRouter(tags=["trail talk"])


@router.get("/trail-talk", response_model=list[TrailTalkPostRead])
def list_trail_talk_posts(
    category: str = Query(default=""),
    area_slug: str = Query(default=""),
    status: str = Query(default="approved"),
    db: Session = Depends(get_db),
) -> list[TrailTalkPost]:
    query = db.query(TrailTalkPost)
    if category:
        query = query.filter(TrailTalkPost.category == category)
    if area_slug:
        query = query.filter(TrailTalkPost.area_slug == area_slug)
    if status != "all":
        query = query.filter(TrailTalkPost.status == status)
    return query.order_by(TrailTalkPost.created_at.desc()).all()


@router.post("/trail-talk", response_model=TrailTalkPostAdminRead)
def create_trail_talk_post(
    payload: TrailTalkPostCreate,
    db: Session = Depends(get_db),
) -> TrailTalkPost:
    data = payload.model_dump()
    data["email"] = data["email"].strip().lower()
    post = TrailTalkPost(
        **data,
        status="pending",
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.get("/admin/trail-talk", response_model=list[TrailTalkPostAdminRead])
def list_admin_trail_talk_posts(
    _: None = Depends(require_admin),
    status: str = Query(default="pending"),
    db: Session = Depends(get_db),
) -> list[TrailTalkPost]:
    query = db.query(TrailTalkPost)
    if status != "all":
        query = query.filter(TrailTalkPost.status == status)
    return query.order_by(TrailTalkPost.created_at.desc()).all()


@router.post("/admin/trail-talk/{post_id}/moderate", response_model=TrailTalkPostAdminRead)
def moderate_trail_talk_post(
    post_id: int,
    payload: TrailTalkModerationUpdate,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TrailTalkPost:
    allowed_statuses = {"pending", "approved", "rejected"}
    if payload.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Unknown Trail Talk status")

    post = db.get(TrailTalkPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Trail Talk post not found")

    post.status = payload.status
    db.commit()
    db.refresh(post)
    return post
