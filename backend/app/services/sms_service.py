import base64
import re
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.database import get_settings


@dataclass
class SmsResult:
    sent: bool
    message: str


def normalize_us_phone(phone: str) -> str:
    digits = re.sub(r"\D+", "", phone)
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    if phone.strip().startswith("+") and 8 <= len(digits) <= 15:
        return f"+{digits}"
    return ""


def get_http_error_message(exc: HTTPError) -> str:
    try:
        body = exc.read().decode("utf-8")
    except Exception:
        body = ""
    return f"{exc.code} {exc.reason}{f': {body}' if body else ''}"


def send_sms(to_phone: str, body: str) -> SmsResult:
    settings = get_settings()
    to_number = normalize_us_phone(to_phone)
    from_number = normalize_us_phone(settings.twilio_from_phone)

    if not settings.twilio_account_sid or not settings.twilio_auth_token or not from_number:
        return SmsResult(sent=False, message="SMS is not configured.")
    if not to_number:
        return SmsResult(sent=False, message="A valid phone number is required.")
    if not body.strip():
        return SmsResult(sent=False, message="SMS message is empty.")

    credentials = f"{settings.twilio_account_sid}:{settings.twilio_auth_token}".encode("utf-8")
    encoded_credentials = base64.b64encode(credentials).decode("ascii")
    payload = urlencode(
        {
            "To": to_number,
            "From": from_number,
            "Body": body.strip()[:1500],
        }
    ).encode("utf-8")
    request = Request(
        f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json",
        data=payload,
        headers={
            "Authorization": f"Basic {encoded_credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if 200 <= response.status < 300:
                return SmsResult(sent=True, message="SMS sent.")
    except HTTPError as exc:
        return SmsResult(sent=False, message=f"Unable to send SMS: {get_http_error_message(exc)}")
    except (URLError, TimeoutError) as exc:
        return SmsResult(sent=False, message=f"Unable to send SMS: {exc}")

    return SmsResult(sent=False, message="Unable to send SMS.")


def send_marketing_lead_status_sms(
    to_phone: str,
    status: str,
    lead_type: str,
) -> SmsResult:
    lead_label = "business listing" if lead_type == "business_availability" else "launch access"
    messages = {
        "contacted": (
            f"Appalachia Offroad: we received your {lead_label} request. "
            "Our team will follow up soon. Reply STOP to opt out."
        ),
        "converted": (
            f"Appalachia Offroad: your {lead_label} request is moving forward. "
            "Watch for setup details. Reply STOP to opt out."
        ),
        "closed": (
            "Appalachia Offroad: thanks for reaching out. We are not moving forward "
            "with this request right now. Reply STOP to opt out."
        ),
    }
    return send_sms(to_phone, messages.get(status, messages["contacted"]))
