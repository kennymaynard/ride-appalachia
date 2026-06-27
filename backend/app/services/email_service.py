import json
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.database import get_settings


@dataclass
class EmailResult:
    sent: bool
    message: str


def send_business_login_email(to_email: str, business_name: str, access_url: str) -> EmailResult:
    settings = get_settings()
    if not settings.resend_api_key:
        return EmailResult(
            sent=False,
            message="Email is not configured. Development access link returned.",
        )

    payload = {
        "from": settings.email_from,
        "to": [to_email],
        "subject": f"Open your {business_name} Appalachia Offroad dashboard",
        "html": (
            "<h1>Open your Appalachia Offroad dashboard</h1>"
            f"<p>Use this secure link to manage {business_name}, update your listing, "
            "add specials, and track rider activity.</p>"
            f'<p><a href="{access_url}">Open Business Portal</a></p>'
            "<p>If you did not request this, you can ignore this email.</p>"
        ),
        "text": (
            f"Open your Appalachia Offroad dashboard for {business_name}:\n\n"
            f"{access_url}\n\n"
            "If you did not request this, you can ignore this email."
        ),
    }
    request = Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if 200 <= response.status < 300:
                return EmailResult(sent=True, message="Login link sent to your email.")
    except (HTTPError, URLError, TimeoutError) as exc:
        return EmailResult(sent=False, message=f"Unable to send login email: {exc}")

    return EmailResult(sent=False, message="Unable to send login email.")


def send_lead_notification(lead_type: str, email: str, details: dict[str, str]) -> EmailResult:
    settings = get_settings()
    if not settings.resend_api_key or not settings.lead_notify_email:
        return EmailResult(sent=False, message="Lead notification email is not configured.")

    rows = "".join(
        f"<li><strong>{key.replace('_', ' ').title()}:</strong> {value}</li>"
        for key, value in details.items()
        if value
    )
    subject = "New business lead" if lead_type == "business_availability" else "New launch access signup"
    payload = {
        "from": settings.email_from,
        "to": [settings.lead_notify_email],
        "subject": f"Appalachia Offroad: {subject}",
        "html": (
            f"<h1>{subject}</h1>"
            f"<p><strong>Email:</strong> {email}</p>"
            f"<ul>{rows}</ul>"
        ),
        "text": "\n".join([subject, f"Email: {email}", *[f"{key}: {value}" for key, value in details.items() if value]]),
    }
    request = Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if 200 <= response.status < 300:
                return EmailResult(sent=True, message="Lead notification sent.")
    except (HTTPError, URLError, TimeoutError) as exc:
        return EmailResult(sent=False, message=f"Unable to send lead notification: {exc}")

    return EmailResult(sent=False, message="Unable to send lead notification.")
