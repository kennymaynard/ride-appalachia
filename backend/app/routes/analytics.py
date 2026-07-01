from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PageVisit
from app.schemas import PageVisitCreate

router = APIRouter(tags=["analytics"])


@router.post("/analytics/page-visits")
def record_page_visit(payload: PageVisitCreate, db: Session = Depends(get_db)) -> dict[str, bool]:
    path = payload.path.strip()[:240]
    if not path.startswith("/"):
        path = f"/{path}"
    db.add(PageVisit(path=path, referrer=payload.referrer.strip()[:500]))
    db.commit()
    return {"ok": True}
