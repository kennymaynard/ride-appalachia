import json
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.database import get_settings


@dataclass
class EmailResult:
    sent: bool
    message: str


def get_http_error_message(exc: HTTPError) -> str:
    try:
        body = exc.read().decode("utf-8")
    except Exception:
        body = ""
    return f"{exc.code} {exc.reason}{f': {body}' if body else ''}"


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
    except HTTPError as exc:
        return EmailResult(sent=False, message=f"Unable to send login email: {get_http_error_message(exc)}")
    except (URLError, TimeoutError) as exc:
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
    except HTTPError as exc:
        return EmailResult(sent=False, message=f"Unable to send lead notification: {get_http_error_message(exc)}")
    except (URLError, TimeoutError) as exc:
        return EmailResult(sent=False, message=f"Unable to send lead notification: {exc}")

    return EmailResult(sent=False, message="Unable to send lead notification.")


def send_marketing_lead_status_email(
    to_email: str,
    status: str,
    lead_type: str,
    business_name: str = "",
) -> EmailResult:
    settings = get_settings()
    if not settings.resend_api_key or not to_email:
        return EmailResult(sent=False, message="Lead status email is not configured.")

    display_name = business_name.strip() or "there"
    lead_label = "business listing" if lead_type == "business_availability" else "launch access"
    status_messages = {
        "contacted": (
            "We received your request",
            f"Hi {display_name}, we received your {lead_label} request for Appalachia Offroad. "
            "Someone from our team will follow up with the next steps.",
        ),
        "converted": (
            "Your Appalachia Offroad request is moving forward",
            f"Hi {display_name}, your {lead_label} request is moving forward. "
            "Watch for the next message from Appalachia Offroad with setup details.",
        ),
        "closed": (
            "Update on your Appalachia Offroad request",
            f"Hi {display_name}, thank you for reaching out to Appalachia Offroad. "
            "We are not moving forward with this request right now, but we appreciate your interest.",
        ),
    }
    subject_text, body_text = status_messages.get(status, status_messages["contacted"])
    payload = {
        "from": settings.email_from,
        "to": [to_email],
        "subject": f"Appalachia Offroad: {subject_text}",
        "html": (
            f"<h1>{subject_text}</h1>"
            f"<p>{body_text}</p>"
            f"<p>If you have questions, reply to this email or visit {settings.frontend_url}/contact.</p>"
        ),
        "text": f"{subject_text}\n\n{body_text}\n\nQuestions? Visit {settings.frontend_url}/contact.",
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
                return EmailResult(sent=True, message="Lead status email sent.")
    except HTTPError as exc:
        return EmailResult(sent=False, message=f"Unable to send lead status email: {get_http_error_message(exc)}")
    except (URLError, TimeoutError) as exc:
        return EmailResult(sent=False, message=f"Unable to send lead status email: {exc}")

    return EmailResult(sent=False, message="Unable to send lead status email.")


def send_business_approval_notification(
    business_name: str,
    owner_email: str,
    category: str,
    tier: str,
    location: str,
    admin_url: str,
) -> EmailResult:
    settings = get_settings()
    if not settings.resend_api_key or not settings.lead_notify_email:
        return EmailResult(sent=False, message="Business approval notification is not configured.")

    subject = "New business pending approval"
    payload = {
        "from": settings.email_from,
        "to": [settings.lead_notify_email],
        "subject": f"Appalachia Offroad: {subject}",
        "html": (
            f"<h1>{subject}</h1>"
            f"<p><strong>Business:</strong> {business_name}</p>"
            f"<p><strong>Owner email:</strong> {owner_email or 'Not provided'}</p>"
            f"<p><strong>Category:</strong> {category}</p>"
            f"<p><strong>Tier:</strong> {tier}</p>"
            f"<p><strong>Location:</strong> {location}</p>"
            f'<p><a href="{admin_url}">Open Admin Approval Queue</a></p>'
        ),
        "text": "\n".join(
            [
                subject,
                f"Business: {business_name}",
                f"Owner email: {owner_email or 'Not provided'}",
                f"Category: {category}",
                f"Tier: {tier}",
                f"Location: {location}",
                f"Admin: {admin_url}",
            ],
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
                return EmailResult(sent=True, message="Business approval notification sent.")
    except HTTPError as exc:
        return EmailResult(
            sent=False,
            message=f"Unable to send business approval notification: {get_http_error_message(exc)}",
        )
    except (URLError, TimeoutError) as exc:
        return EmailResult(sent=False, message=f"Unable to send business approval notification: {exc}")

    return EmailResult(sent=False, message="Unable to send business approval notification.")


def send_booking_cancellation_request_notification(
    to_email: str,
    business_name: str,
    customer_name: str,
    booking_id: int,
    reason: str,
    dashboard_url: str,
) -> EmailResult:
    settings = get_settings()
    if not settings.resend_api_key or not to_email:
        return EmailResult(sent=False, message="Booking cancellation notification is not configured.")

    subject = f"Cancellation request for booking #{booking_id}"
    payload = {
        "from": settings.email_from,
        "to": [to_email],
        "subject": f"Appalachia Offroad: {subject}",
        "html": (
            f"<h1>{subject}</h1>"
            f"<p><strong>Business:</strong> {business_name}</p>"
            f"<p><strong>Customer:</strong> {customer_name}</p>"
            f"<p><strong>Reason:</strong> {reason or 'No reason provided.'}</p>"
            f'<p><a href="{dashboard_url}">Open Business Dashboard</a></p>'
        ),
        "text": "\n".join(
            [
                subject,
                f"Business: {business_name}",
                f"Customer: {customer_name}",
                f"Reason: {reason or 'No reason provided.'}",
                f"Dashboard: {dashboard_url}",
            ],
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
                return EmailResult(sent=True, message="Cancellation request notification sent.")
    except HTTPError as exc:
        return EmailResult(sent=False, message=f"Unable to send cancellation request notification: {get_http_error_message(exc)}")
    except (URLError, TimeoutError) as exc:
        return EmailResult(sent=False, message=f"Unable to send cancellation request notification: {exc}")

    return EmailResult(sent=False, message="Unable to send cancellation request notification.")


def send_booking_cancellation_decision_email(
    to_email: str,
    customer_name: str,
    booking_id: int,
    approved: bool,
    note: str,
    booking_url: str,
) -> EmailResult:
    settings = get_settings()
    if not settings.resend_api_key or not to_email:
        return EmailResult(sent=False, message="Booking cancellation decision email is not configured.")

    decision = "approved" if approved else "declined"
    subject = f"Your booking cancellation was {decision}"
    payload = {
        "from": settings.email_from,
        "to": [to_email],
        "subject": f"Appalachia Offroad: {subject}",
        "html": (
            f"<h1>{subject}</h1>"
            f"<p>{customer_name}, your cancellation request for booking #{booking_id} was {decision}.</p>"
            f"<p><strong>Business note:</strong> {note or 'No note provided.'}</p>"
            f'<p><a href="{booking_url}">View Booking</a></p>'
        ),
        "text": "\n".join(
            [
                subject,
                f"{customer_name}, your cancellation request for booking #{booking_id} was {decision}.",
                f"Business note: {note or 'No note provided.'}",
                f"Booking: {booking_url}",
            ],
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
                return EmailResult(sent=True, message="Cancellation decision email sent.")
    except HTTPError as exc:
        return EmailResult(sent=False, message=f"Unable to send cancellation decision email: {get_http_error_message(exc)}")
    except (URLError, TimeoutError) as exc:
        return EmailResult(sent=False, message=f"Unable to send cancellation decision email: {exc}")

    return EmailResult(sent=False, message="Unable to send cancellation decision email.")
