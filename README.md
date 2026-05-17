# Appalachia Offroad

MVP marketplace for ATV and UTV riders to find lodging, food, rentals, repairs,
fuel, and deals across Appalachia.

## Stack

- Frontend: Next.js responsive web app
- Backend: FastAPI
- Database: PostgreSQL
- Payments: Stripe subscriptions
- Hosting target: DigitalOcean or Render

## Local Development

```bash
docker compose up --build
```

Frontend: http://localhost:3000

Backend: http://localhost:8000/docs

## MVP Scope

Built first:

- Public marketplace category pages
- Business listing pages
- Simple business dashboard
- Stripe subscription checkout endpoint
- Admin approval and featured controls
- Owner access token dashboard links
- Planner checklist with location filtering, save, copy, and print
- Click tracking for rider actions
- Photo validation and category fallbacks
- Admin moderation statuses
- Password-protected admin API and dashboard
- Business listing claim flow with owner email capture
- Business login emails through Resend, with a local development fallback link
- Monthly sponsorship placement and sponsored listing badges
- Lodging-owner service requests for cleaners, turnover help, laundry, hot tub service, trash, maintenance, and lawn care
- Cleaner partner tier at $29.99/month with no per-clean cut and unlimited cleaning opportunities

## Launch Prep

- Copy `.env.example` to `.env` and fill Stripe values.
- Set `ADMIN_PASSWORD` before sharing the admin page. Local default is `ride-admin`.
- Add `RESEND_API_KEY` and `EMAIL_FROM` to send real business login emails.
- Create Stripe subscription prices for the $29, $59, $99, and $149 tiers, then paste their price IDs into `.env`.
- Create the `$29.99` Cleaner Partner Stripe price and paste it into `STRIPE_PRICE_CLEANER_PARTNER`.
- Add the Stripe webhook endpoint `/api/subscriptions/webhook` in Stripe and paste the signing secret into `STRIPE_WEBHOOK_SECRET`.
- Local app runs with `docker compose up --build`.
- Render deployment config is in `render.yaml`.
- Step-by-step deployment checklist is in `DEPLOYMENT.md`.
- Alembic scaffolding is in `backend/alembic`; current Docker startup also runs a lightweight compatibility migration for local volumes.
- `/api/subscriptions/webhook-test` remains for local manual testing; production should use the signed Stripe webhook.

Not included yet:

- Native mobile apps
- Booking engine
- GPS-heavy maps
- Social feed
- Rider accounts
- Custom messaging
