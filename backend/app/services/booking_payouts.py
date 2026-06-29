from datetime import date

from sqlalchemy.orm import Session

from app.database import Settings
from app.models import BookingTransfer, Business
from app.services.stripe_service import create_connected_account_transfer


def process_due_booking_transfers(db: Session, settings: Settings) -> dict[str, int]:
    today = date.today().isoformat()
    transfers = (
        db.query(BookingTransfer)
        .filter(
            BookingTransfer.status == "scheduled_after_checkin",
            BookingTransfer.release_date <= today,
        )
        .all()
    )

    processed = 0
    missing_connect_account = 0
    failed = 0
    for transfer in transfers:
        business = db.get(Business, transfer.business_id)
        if not business or not business.stripe_connect_account_id:
            transfer.status = "missing_connect_account"
            missing_connect_account += 1
            continue

        try:
            transfer.stripe_transfer_id = create_connected_account_transfer(
                settings,
                transfer.amount_cents,
                business.stripe_connect_account_id,
                transfer.booking_id,
            )
            transfer.status = "paid"
            processed += 1
        except RuntimeError:
            transfer.status = "failed"
            failed += 1

    db.commit()
    return {
        "due": len(transfers),
        "processed": processed,
        "missing_connect_account": missing_connect_account,
        "failed": failed,
    }
