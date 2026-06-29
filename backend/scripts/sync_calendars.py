import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def post_admin_job(backend_url: str, admin_password: str, path: str) -> dict:
    request = Request(
        f"{backend_url}{path}",
        method="POST",
        headers={
            "x-admin-password": admin_password,
            "Content-Type": "application/json",
            "User-Agent": "AppalachiaOffroadScheduledJobs/1.0",
        },
    )
    with urlopen(request, timeout=90) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    backend_url = os.environ.get("BACKEND_URL", "https://api.appalachiaoffroadapp.com").rstrip("/")
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    if not admin_password:
        print("ADMIN_PASSWORD is required", file=sys.stderr)
        return 1

    try:
        calendar_payload = post_admin_job(backend_url, admin_password, "/api/admin/calendar-sync")
        payout_payload = post_admin_job(backend_url, admin_password, "/api/admin/booking-transfers/process")
    except HTTPError as exc:
        print(f"Scheduled job failed with HTTP {exc.code}: {exc.read().decode('utf-8', errors='replace')}", file=sys.stderr)
        return 1
    except (OSError, URLError) as exc:
        print(f"Scheduled job failed: {exc}", file=sys.stderr)
        return 1

    print(json.dumps({"calendar_sync": calendar_payload, "booking_payouts": payout_payload}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
