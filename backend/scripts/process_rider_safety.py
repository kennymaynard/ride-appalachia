from app.database import SessionLocal
from app.services.rider_safety import process_due_checkpoints, purge_expired_locations

if __name__ == "__main__":
    db = SessionLocal()
    try:
        print({"alerts_processed": process_due_checkpoints(db), "locations_deleted": purge_expired_locations(db)})
    finally:
        db.close()
