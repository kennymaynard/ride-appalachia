# Phase 2 event reminders

Event reminders are opt-in and processed only by an authenticated scheduler request. Normal page requests never send reminders.

## Render cron

Create a daily Render Cron Job using the backend image/environment and call:

```text
POST https://<backend-host>/api/admin/event-reminders/run
X-Admin-Password: <ADMIN_PASSWORD>
```

Recommended schedule: `15 12 * * *` (daily at 12:15 UTC). The processor selects approved future events, respects rider email/SMS preferences, and records `sent_at` so retries do not duplicate successfully delivered reminders.

Monitor failed deliveries in application logs. Failed sends remain unsent and are eligible for the next scheduler retry.
