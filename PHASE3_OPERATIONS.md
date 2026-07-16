# Phase 3 event discovery operations

Event discovery is allow-list-only. Admins add a public HTTP(S) source, review its terms and robots policy, explicitly trust it, and activate it. Production seeds no sources. Candidates remain private until an admin approves or merges them.

## Render cron

The Render Blueprint creates `appalachia-offroad-ride-scanner`, which sends:

```text
POST https://<backend-host>/api/admin/event-discovery/run?max_sources=100
X-Admin-Password: <ADMIN_PASSWORD>
```

The configured schedule is `0 11,23 * * *`, twice daily at 11:00 and 23:00 UTC. Add the same `ADMIN_PASSWORD` used by the backend to the cron service in Render. The endpoint locks each source for 30 minutes, upserts by source/external ID, records every scan, applies timeouts, and deactivates a source after five consecutive failures.

The scanner covers active, admin-approved sources in KY, WV, VA, TN, and NC. Sources must first be added, trusted, and activated in Admin → Events Intelligence. A successful run with zero scanned sources means the source registry is still empty or every source is inactive.

Run it manually with:

```bash
BACKEND_URL=https://api.appalachiaoffroadapp.com ADMIN_PASSWORD=... python backend/scripts/scan_events.py
```

## Compliance

- Descriptive scanner user agent and sensible response/time limits.
- `robots.txt` checks for HTML pages.
- No logins, CAPTCHA bypass, private groups, attendee data, browser automation, or unrestricted social scraping.
- Only JSON-LD Event metadata, public RSS/Atom, public iCalendar, and explicitly approved public endpoints are processed.
- Descriptions/raw review excerpts are capped at 1,000 characters and should be purged after 90 days for rejected candidates; normalized metadata and source URLs may remain for audit and duplicate prevention.
- Confidence never auto-publishes an event. Verification and featured placement remain separate explicit admin decisions.
