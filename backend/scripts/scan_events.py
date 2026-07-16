"""Run the allow-listed Appalachia ride scanner from a scheduled job."""

import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def run_scan(backend_url: str, admin_password: str, max_sources: int = 100) -> dict:
    query = urlencode({"max_sources": max_sources})
    request = Request(
        f"{backend_url.rstrip('/')}/api/admin/event-discovery/run?{query}",
        method="POST",
        headers={
            "x-admin-password": admin_password,
            "Content-Type": "application/json",
            "User-Agent": "AppalachiaOffroadRideScanner/1.0",
        },
    )
    with urlopen(request, timeout=900) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    backend_url = os.environ.get("BACKEND_URL", "https://api.appalachiaoffroadapp.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    max_sources = int(os.environ.get("EVENT_SCAN_MAX_SOURCES", "100"))
    if not admin_password:
        print("ADMIN_PASSWORD is required", file=sys.stderr)
        return 1
    if not 1 <= max_sources <= 100:
        print("EVENT_SCAN_MAX_SOURCES must be between 1 and 100", file=sys.stderr)
        return 1

    try:
        payload = run_scan(backend_url, admin_password, max_sources)
    except HTTPError as exc:
        print(f"Ride scan failed with HTTP {exc.code}: {exc.read().decode('utf-8', errors='replace')}", file=sys.stderr)
        return 1
    except (OSError, URLError, ValueError, json.JSONDecodeError) as exc:
        print(f"Ride scan failed: {exc}", file=sys.stderr)
        return 1

    results = payload.get("results", [])
    failed = [result for result in results if result.get("status") not in {"success", "locked"}]
    summary = {
        "sources_scanned": payload.get("sources_scanned", 0),
        "successful": sum(result.get("status") == "success" for result in results),
        "locked": sum(result.get("status") == "locked" for result in results),
        "failed": len(failed),
        "candidates_created": sum(int(result.get("created", 0)) for result in results),
        "candidates_updated": sum(int(result.get("updated", 0)) for result in results),
    }
    print(json.dumps({"ride_scan": summary, "failures": failed}, sort_keys=True))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
