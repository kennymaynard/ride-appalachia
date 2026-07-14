import json
import hashlib
from html import escape
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.database import get_settings


@dataclass
class EmailResult:
    sent: bool
    message: str


@dataclass
class ResendDirectTestResult:
    sent: bool
    message: str
    payload: dict[str, str | list[str]]
    response_status: int | None = None
    response_body: str = ""


def get_http_error_message(exc: HTTPError) -> str:
    try:
        body = exc.read().decode("utf-8")
    except Exception:
        body = ""
    return f"{exc.code} {exc.reason}{f': {body}' if body else ''}"


def clean_email_setting(value: str) -> str:
    return value.strip()


def clean_secret_setting(value: str) -> str:
    return value.strip()


def get_resend_key_diagnostic(api_key: str) -> dict[str, str | int | bool]:
    clean_key = clean_secret_setting(api_key)
    return {
        "length": len(clean_key),
        "starts": clean_key[:8],
        "ends": clean_key[-8:] if clean_key else "",
        "sha256": hashlib.sha256(clean_key.encode()).hexdigest(),
        "has_spaces": clean_key != api_key,
    }


def get_resend_headers(resend_api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json",
        "User-Agent": "appalachia-offroad-email-diagnostic/1.0",
    }


def get_resend_error_message(action: str, exc: HTTPError, email_from: str) -> str:
    detail = get_http_error_message(exc)
    help_text = ""
    if exc.code == 403 or "1010" in detail:
        help_text = (
            " Resend rejected the sending address. Verify the domain in Resend, "
            "confirm the DNS records are active, and make sure EMAIL_FROM uses "
            f"that verified sender. Current EMAIL_FROM: {email_from}."
        )
    return f"Unable to send {action}: {detail}.{help_text}"


def send_resend_direct_test_email() -> ResendDirectTestResult:
    settings = get_settings()
    resend_api_key = clean_secret_setting(settings.resend_api_key)
    email_from = clean_email_setting(settings.email_from)
    lead_notify_email = clean_email_setting(settings.lead_notify_email)
    payload: dict[str, str | list[str]] = {
        "from": email_from,
        "to": [lead_notify_email],
        "subject": "Render direct test",
        "text": "Render direct test",
    }
    if not resend_api_key or not email_from or not lead_notify_email:
        return ResendDirectTestResult(
            sent=False,
            message="Direct Resend test is not configured.",
            payload=payload,
        )

    request = Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers=get_resend_headers(resend_api_key),
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            response_body = response.read().decode("utf-8")
            return ResendDirectTestResult(
                sent=200 <= response.status < 300,
                message="Direct Resend test email sent.",
                payload=payload,
                response_status=response.status,
                response_body=response_body,
            )
    except HTTPError as exc:
        try:
            response_body = exc.read().decode("utf-8")
        except Exception:
            response_body = ""
        return ResendDirectTestResult(
            sent=False,
            message=get_resend_error_message("direct Resend test email", exc, email_from),
            payload=payload,
            response_status=exc.code,
            response_body=response_body,
        )
    except (URLError, TimeoutError) as exc:
        return ResendDirectTestResult(
            sent=False,
            message=f"Unable to send direct Resend test email: {exc}",
            payload=payload,
        )


def send_trip_plan_email(to_email: str, destination: str, plan_text: str) -> EmailResult:
    settings = get_settings()
    resend_api_key = clean_secret_setting(settings.resend_api_key)
    email_from = clean_email_setting(settings.email_from)
    clean_to_email = clean_email_setting(to_email)
    clean_destination = destination.strip() or "your ride"
    clean_plan = plan_text.strip()
    if not resend_api_key or not clean_to_email:
        return EmailResult(sent=False, message="Trip plan email is not configured.")
    if not clean_plan:
        return EmailResult(sent=False, message="Trip plan is empty.")

    payload = {
        "from": email_from,
        "to": [clean_to_email],
        "subject": f"Your Appalachia Offroad trip plan for {clean_destination}",
        "html": (
            "<h1>Your Appalachia Offroad trip plan</h1>"
            f"<p>Destination: <strong>{escape(clean_destination)}</strong></p>"
            "<p>Save this before you lose service, and verify trail rules before riding.</p>"
            f"<pre style=\"white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;line-height:1.5\">{escape(clean_plan)}</pre>"
        ),
        "text": clean_plan,
    }
    request = Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers=get_resend_headers(resend_api_key),
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if 200 <= response.status < 300:
                return EmailResult(sent=True, message="Trip plan emailed.")
    except HTTPError as exc:
        return EmailResult(sent=False, message=get_resend_error_message("trip plan email", exc, email_from))
    except (URLError, TimeoutError) as exc:
        return EmailResult(sent=False, message=f"Unable to send trip plan email: {exc}")

    return EmailResult(sent=False, message="Unable to send trip plan email.")


def send_safety_email(to_email: str, subject: str, body: str) -> EmailResult:
    """Send a plain safety notification without implying guaranteed delivery."""
    settings = get_settings()
    clean_to = clean_email_setting(to_email)
    if not settings.resend_api_key or not clean_to:
        return EmailResult(sent=False, message="Safety email is not configured.")
    payload = {
        "from": clean_email_setting(settings.email_from),
        "to": [clean_to],
        "subject": subject.strip()[:180],
        "text": body.strip(),
        "html": f"<p>{escape(body.strip()).replace(chr(10), '<br>')}</p>",
    }
    request = Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers=get_resend_headers(settings.resend_api_key),
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            if 200 <= response.status < 300:
                return EmailResult(sent=True, message="Safety email sent.")
    except HTTPError as exc:
        return EmailResult(sent=False, message=get_resend_error_message("safety email", exc, settings.email_from))
    except (URLError, TimeoutError) as exc:
        return EmailResult(sent=False, message=f"Unable to send safety email: {exc}")
    return EmailResult(sent=False, message="Unable to send safety email.")


def build_business_approval_notification_payload(
    email_from: str,
    lead_notify_email: str,
    business_name: str,
    owner_email: str,
    category: str,
    tier: str,
    location: str,
    admin_url: str,
) -> dict[str, str | list[str]]:
    subject = "New business pending approval"
    return {
        "from": email_from,
        "to": [lead_notify_email],
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


def send_business_login_email(to_email: str, business_name: str, access_url: str) -> EmailResult:
    settings = get_settings()
    resend_api_key = clean_secret_setting(settings.resend_api_key)
    email_from = clean_email_setting(settings.email_from)
    if not resend_api_key:
        return EmailResult(
            sent=False,
            message="Email is not configured. Development access link returned.",
        )

    payload = {
        "from": email_from,
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
        headers=get_resend_headers(resend_api_key),
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if 200 <= response.status < 300:
                return EmailResult(sent=True, message="Login link sent to your email.")
    except HTTPError as exc:
        return EmailResult(sent=False, message=get_resend_error_message("login email", exc, email_from))
    except (URLError, TimeoutError) as exc:
        return EmailResult(sent=False, message=f"Unable to send login email: {exc}")

    return EmailResult(sent=False, message="Unable to send login email.")


def send_rider_password_reset_email(to_email: str, display_name: str, reset_url: str) -> EmailResult:
    settings = get_settings()
    resend_api_key = clean_secret_setting(settings.resend_api_key)
    email_from = clean_email_setting(settings.email_from)
    clean_to_email = clean_email_setting(to_email)
    if not resend_api_key or not clean_to_email:
        return EmailResult(
            sent=False,
            message="Email is not configured. Development reset link returned.",
        )

    greeting = display_name.strip() or "Rider"
    payload = {
        "from": email_from,
        "to": [clean_to_email],
        "subject": "Reset your Appalachia Offroad rider password",
        "html": (
            "<h1>Reset your rider password</h1>"
            f"<p>Hi {escape(greeting)}, use this secure link to set a new password for your rider profile.</p>"
            f'<p><a href="{reset_url}">Reset Rider Password</a></p>'
            "<p>If you did not request this, you can ignore this email.</p>"
        ),
        "text": (
            f"Hi {greeting}, reset your Appalachia Offroad rider password here:\n\n"
            f"{reset_url}\n\n"
            "If you did not request this, you can ignore this email."
        ),
    }
    request = Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers=get_resend_headers(resend_api_key),
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if 200 <= response.status < 300:
                return EmailResult(sent=True, message="Password reset link sent.")
    except HTTPError as exc:
        return EmailResult(sent=False, message=get_resend_error_message("rider password reset email", exc, email_from))
    except (URLError, TimeoutError) as exc:
        return EmailResult(sent=False, message=f"Unable to send rider password reset email: {exc}")

    return EmailResult(sent=False, message="Unable to send rider password reset email.")


def send_lead_notification(lead_type: str, email: str, details: dict[str, str]) -> EmailResult:
    settings = get_settings()
    resend_api_key = clean_secret_setting(settings.resend_api_key)
    email_from = clean_email_setting(settings.email_from)
    lead_notify_email = clean_email_setting(settings.lead_notify_email)
    if not resend_api_key or not lead_notify_email:
        return EmailResult(sent=False, message="Lead notification email is not configured.")

    rows = "".join(
        f"<li><strong>{key.replace('_', ' ').title()}:</strong> {value}</li>"
        for key, value in details.items()
        if value
    )
    subject = "New business lead" if lead_type == "business_availability" else "New launch access signup"
    payload = {
        "from": email_from,
        "to": [lead_notify_email],
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
        headers=get_resend_headers(resend_api_key),
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if 200 <= response.status < 300:
                return EmailResult(sent=True, message="Lead notification sent.")
    except HTTPError as exc:
        return EmailResult(sent=False, message=get_resend_error_message("lead notification", exc, email_from))
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
    resend_api_key = clean_secret_setting(settings.resend_api_key)
    email_from = clean_email_setting(settings.email_from)
    if not resend_api_key or not to_email:
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
        "from": email_from,
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
        headers=get_resend_headers(resend_api_key),
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if 200 <= response.status < 300:
                return EmailResult(sent=True, message="Lead status email sent.")
    except HTTPError as exc:
        return EmailResult(sent=False, message=get_resend_error_message("lead status email", exc, email_from))
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
    resend_api_key = clean_secret_setting(settings.resend_api_key)
    email_from = clean_email_setting(settings.email_from)
    lead_notify_email = clean_email_setting(settings.lead_notify_email)
    if not resend_api_key or not lead_notify_email:
        return EmailResult(sent=False, message="Business approval notification is not configured.")

    payload = build_business_approval_notification_payload(
        email_from,
        lead_notify_email,
        business_name,
        owner_email,
        category,
        tier,
        location,
        admin_url,
    )
    request = Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers=get_resend_headers(resend_api_key),
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if 200 <= response.status < 300:
                return EmailResult(sent=True, message="Business approval notification sent.")
    except HTTPError as exc:
        return EmailResult(
            sent=False,
            message=get_resend_error_message(
                "business approval notification",
                exc,
                email_from,
            ),
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
    resend_api_key = clean_secret_setting(settings.resend_api_key)
    email_from = clean_email_setting(settings.email_from)
    if not resend_api_key or not to_email:
        return EmailResult(sent=False, message="Booking cancellation notification is not configured.")

    subject = f"Cancellation request for booking #{booking_id}"
    payload = {
        "from": email_from,
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
        headers=get_resend_headers(resend_api_key),
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if 200 <= response.status < 300:
                return EmailResult(sent=True, message="Cancellation request notification sent.")
    except HTTPError as exc:
        return EmailResult(sent=False, message=get_resend_error_message("cancellation request notification", exc, email_from))
    except (URLError, TimeoutError) as exc:
        return EmailResult(sent=False, message=f"Unable to send cancellation request notification: {exc}")

    return EmailResult(sent=False, message="Unable to send cancellation request notification.")


def send_booking_confirmation_emails(
    customer_email: str,
    business_email: str,
    admin_email: str,
    business_name: str,
    customer_name: str,
    booking_id: int,
    listing_title: str,
    start_date: str,
    end_date: str,
    subtotal_cents: int,
    cleaning_fee_cents: int,
    taxes_cents: int,
    platform_fee_cents: int,
    total_cents: int,
    booking_url: str,
) -> list[EmailResult]:
    settings = get_settings()
    resend_api_key = clean_secret_setting(settings.resend_api_key)
    email_from = clean_email_setting(settings.email_from)
    recipients = [
        ("customer", customer_email),
        ("business", business_email),
        ("admin", admin_email),
    ]
    if not resend_api_key:
        return [EmailResult(sent=False, message="Booking confirmation email is not configured.")]

    def dollars(cents: int) -> str:
        return f"${cents / 100:.2f}"

    subject = f"Booking #{booking_id} confirmed"
    html = (
        f"<h1>{subject}</h1>"
        f"<p><strong>Business:</strong> {escape(business_name)}</p>"
        f"<p><strong>Customer:</strong> {escape(customer_name)}</p>"
        f"<p><strong>Reservation:</strong> {escape(listing_title)} from {escape(start_date)} to {escape(end_date)}</p>"
        f"<p><strong>Subtotal:</strong> {dollars(subtotal_cents)}</p>"
        f"<p><strong>Cleaning Fee:</strong> {dollars(cleaning_fee_cents)}</p>"
        f"<p><strong>Taxes:</strong> {dollars(taxes_cents)}</p>"
        f"<p><strong>Total Paid:</strong> {dollars(total_cents)}</p>"
        "<p>Payment collected through Appalachia Offroad using Stripe Connect.</p>"
        f"<p>{escape(business_name)} receives the provider payout and remains responsible for applicable taxes and services.</p>"
        f'<p><a href="{booking_url}">View Booking</a></p>'
    )
    text = "\n".join(
        [
            subject,
            f"Business: {business_name}",
            f"Customer: {customer_name}",
            f"Reservation: {listing_title} from {start_date} to {end_date}",
            f"Subtotal: {dollars(subtotal_cents)}",
            f"Cleaning Fee: {dollars(cleaning_fee_cents)}",
            f"Taxes: {dollars(taxes_cents)}",
            f"Total Paid: {dollars(total_cents)}",
            "Payment collected through Appalachia Offroad using Stripe Connect.",
            f"{business_name} receives the provider payout and remains responsible for applicable taxes and services.",
            f"Booking: {booking_url}",
        ],
    )

    results: list[EmailResult] = []
    for audience, to_email in recipients:
        if not to_email:
            continue
        payload = {
            "from": email_from,
            "to": [clean_email_setting(to_email)],
            "subject": f"Appalachia Offroad: {subject}",
            "html": html,
            "text": text,
        }
        request = Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode("utf-8"),
            headers=get_resend_headers(resend_api_key),
            method="POST",
        )
        try:
            with urlopen(request, timeout=10) as response:
                if 200 <= response.status < 300:
                    results.append(EmailResult(sent=True, message=f"Booking confirmation sent to {audience}."))
                    continue
        except HTTPError as exc:
            results.append(EmailResult(sent=False, message=get_resend_error_message("booking confirmation", exc, email_from)))
            continue
        except (URLError, TimeoutError) as exc:
            results.append(EmailResult(sent=False, message=f"Unable to send booking confirmation: {exc}"))
            continue
        results.append(EmailResult(sent=False, message="Unable to send booking confirmation."))
    return results


def send_booking_cancellation_decision_email(
    to_email: str,
    customer_name: str,
    booking_id: int,
    approved: bool,
    note: str,
    booking_url: str,
) -> EmailResult:
    settings = get_settings()
    resend_api_key = clean_secret_setting(settings.resend_api_key)
    email_from = clean_email_setting(settings.email_from)
    if not resend_api_key or not to_email:
        return EmailResult(sent=False, message="Booking cancellation decision email is not configured.")

    decision = "approved" if approved else "declined"
    subject = f"Your booking cancellation was {decision}"
    payload = {
        "from": email_from,
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
        headers=get_resend_headers(resend_api_key),
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            if 200 <= response.status < 300:
                return EmailResult(sent=True, message="Cancellation decision email sent.")
    except HTTPError as exc:
        return EmailResult(sent=False, message=get_resend_error_message("cancellation decision email", exc, email_from))
    except (URLError, TimeoutError) as exc:
        return EmailResult(sent=False, message=f"Unable to send cancellation decision email: {exc}")

    return EmailResult(sent=False, message="Unable to send cancellation decision email.")
