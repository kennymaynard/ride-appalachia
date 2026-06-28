import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def main() -> int:
    backend_url = os.environ.get("BACKEND_URL", "https://api.appalachiaoffroadapp.com").rstrip("/")
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    if not admin_password:
        print("ADMIN_PASSWORD is required", file=sys.stderr)
        return 1

    request = Request(
        f"{backend_url}/api/admin/calendar-sync",
        method="POST",
        headers={
            "x-admin-password": admin_password,
            "Content-Type": "application/json",
            "User-Agent": "AppalachiaOffroadCalendarSync/1.0",
        },
    )
    try:
        with urlopen(request, timeout=90) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        print(f"Calendar sync failed with HTTP {exc.code}: {exc.read().decode('utf-8', errors='replace')}", file=sys.stderr)
        return 1
    except (OSError, URLError) as exc:
        print(f"Calendar sync failed: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(payload, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
