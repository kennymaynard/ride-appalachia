# Phase 3 event discovery operations

Event discovery is allow-list-only. Admins add a public HTTP(S) source, review its terms and robots policy, explicitly trust it, and activate it. Production seeds no sources. Candidates remain private until an admin approves or merges them.

## Render cron

Create a Render cron job that sends:

```text
POST https://<backend-host>/api/admin/event-discovery/run?max_sources=20
X-Admin-Password: <ADMIN_PASSWORD>
```

Recommended cadence is every 12 hours. Official calendars can run daily; active event pages every 12 hours; slower tourism feeds daily or weekly. The endpoint locks each source for 30 minutes, upserts by source/external ID, records every scan, applies timeouts, and deactivates a source after five consecutive failures.

## Compliance

- Descriptive scanner user agent and sensible response/time limits.
- `robots.txt` checks for HTML pages.
- No logins, CAPTCHA bypass, private groups, attendee data, browser automation, or unrestricted social scraping.
- Only JSON-LD Event metadata, public RSS/Atom, public iCalendar, and explicitly approved public endpoints are processed.
- Descriptions/raw review excerpts are capped at 1,000 characters and should be purged after 90 days for rejected candidates; normalized metadata and source URLs may remain for audit and duplicate prevention.
- Confidence never auto-publishes an event. Verification and featured placement remain separate explicit admin decisions.
