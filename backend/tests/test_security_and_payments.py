import asyncio
from datetime import datetime, timedelta, timezone
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, Settings
from app.models import BookableListing, Booking, Business, Rider
from app.routes.admin import get_admin_analytics
from app.routes.riders import confirm_rider_password_reset, login_rider, request_rider_password_reset
from app.routes.subscriptions import stripe_webhook
from app.schemas import RiderLoginRequest, RiderPasswordResetConfirm, RiderPasswordResetRequest
from app.services.email_service import EmailResult
from app.services.passcodes import hash_passcode


class FakeRequest:
    async def body(self):
        return b"{}"


class SecurityAndPaymentsTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()

    def tearDown(self):
        self.db.close()

    def add_rider(self):
        rider = Rider(
            display_name="Rider", email="rider@example.com", password_hash=hash_passcode("oldpass"),
            access_token="normal-access-token",
        )
        self.db.add(rider); self.db.commit(); self.db.refresh(rider)
        return rider

    @patch("app.routes.riders.send_rider_password_reset_email")
    def test_password_reset_is_private_expiring_and_single_use(self, send_email):
        send_email.return_value = EmailResult(sent=True, message="sent")
        unknown = request_rider_password_reset(RiderPasswordResetRequest(email="UNKNOWN@example.com"), self.db)
        rider = self.add_rider()
        known = request_rider_password_reset(RiderPasswordResetRequest(email=" RIDER@EXAMPLE.COM "), self.db)
        self.db.refresh(rider)
        self.assertEqual(unknown["message"], known["message"])
        self.assertEqual(unknown["sent"], known["sent"])
        self.assertEqual(rider.access_token, "normal-access-token")
        self.assertTrue(rider.password_reset_token_hash)
        self.assertNotIn(rider.password_reset_token_hash, known["reset_url"])

        raw_token = known["reset_url"].split("reset_token=", 1)[1]
        result = confirm_rider_password_reset(RiderPasswordResetConfirm(reset_token=raw_token, password="newpass"), self.db)
        self.assertEqual(result.access_token, "normal-access-token")
        self.assertEqual(login_rider(RiderLoginRequest(email="rider@example.com", password="newpass"), self.db).access_token, "normal-access-token")
        with self.assertRaises(HTTPException):
            confirm_rider_password_reset(RiderPasswordResetConfirm(reset_token=raw_token, password="again"), self.db)
        with self.assertRaises(HTTPException):
            confirm_rider_password_reset(RiderPasswordResetConfirm(reset_token="invalid-token-value", password="again"), self.db)

    @patch("app.routes.riders.send_rider_password_reset_email")
    def test_expired_password_reset_fails(self, send_email):
        send_email.return_value = EmailResult(sent=True, message="sent")
        rider = self.add_rider()
        response = request_rider_password_reset(RiderPasswordResetRequest(email=rider.email), self.db)
        rider.password_reset_expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        self.db.commit()
        token = response["reset_url"].split("reset_token=", 1)[1]
        with self.assertRaises(HTTPException):
            confirm_rider_password_reset(RiderPasswordResetConfirm(reset_token=token, password="newpass"), self.db)

    @patch("app.routes.subscriptions.send_booking_confirmation_emails")
    @patch("app.routes.subscriptions.construct_webhook_event")
    def test_duplicate_webhook_sends_confirmation_once(self, construct_event, send_email):
        business = Business(name="Stay", slug="stay", category="lodging", description="Stay", phone="1", location="KY", photo_url="", owner_email="owner@example.com")
        self.db.add(business); self.db.flush()
        listing = BookableListing(business_id=business.id, title="Cabin", listing_type="lodging", description="", location="KY", photo_url="", nightly_rate_cents=10000)
        self.db.add(listing); self.db.flush()
        booking = Booking(listing_id=listing.id, business_id=business.id, customer_name="Guest", customer_email="guest@example.com", start_date="2026-08-01", end_date="2026-08-02", total_cents=10000)
        self.db.add(booking); self.db.commit()
        construct_event.return_value = {"type": "checkout.session.completed", "data": {"object": {"id": "cs_1", "payment_intent": "pi_1", "metadata": {"booking_ids": str(booking.id)}}}}
        send_email.return_value = [EmailResult(sent=True, message="sent")]
        for _ in range(2):
            asyncio.run(stripe_webhook(FakeRequest(), "sig", Settings(), self.db))
        self.assertEqual(send_email.call_count, 1)
        self.db.refresh(booking)
        self.assertIsNotNone(booking.confirmation_email_sent_at)

    def test_deleted_businesses_excluded_from_stripe_analytics(self):
        rows = [
            Business(name="Connected", slug="connected", category="lodging", description="", phone="1", location="KY", photo_url="", stripe_connect_account_id="acct_1", stripe_connect_charges_enabled=True, stripe_connect_payouts_enabled=True),
            Business(name="Missing", slug="missing", category="lodging", description="", phone="1", location="KY", photo_url="", stripe_connect_account_id=""),
            Business(name="Pending", slug="pending", category="lodging", description="", phone="1", location="KY", photo_url="", stripe_connect_account_id="acct_2", stripe_connect_charges_enabled=False),
            Business(name="Deleted", slug="deleted", category="lodging", description="", phone="1", location="KY", photo_url="", stripe_connect_account_id="acct_3", stripe_connect_charges_enabled=True, stripe_connect_payouts_enabled=True, is_deleted=True),
        ]
        self.db.add_all(rows); self.db.commit()
        result = get_admin_analytics(None, self.db)
        self.assertEqual(result.business_count, 3)
        self.assertEqual(result.connected_stripe_accounts, 1)
        self.assertEqual(result.not_connected_stripe_accounts, 1)
        self.assertEqual(result.pending_verification_stripe_accounts, 1)


if __name__ == "__main__":
    unittest.main()
