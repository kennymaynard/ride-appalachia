# Appalachia Offroad Deployment Checklist

## Render Setup

1. Create a GitHub repository named `ride-appalachia`.
2. Push the `ride-appalachia/` folder to that repository.
3. In Render, create a new Blueprint from `render.yaml`.
4. Render will create:
   - `appalachia-offroad-db`
   - `appalachia-offroad-backend`
   - `appalachia-offroad-frontend`
5. Add custom domains in Render:
   - Frontend: `appalachiaoffroadapp.com`
   - Backend: `api.appalachiaoffroadapp.com`
6. Point your DNS records to the Render targets shown on each service.

## Domain DNS Records

Add the exact records Render gives you after the custom domains are added.

Typical setup:

```text
appalachiaoffroadapp.com      ALIAS/ANAME or A record  -> Render frontend target
www.appalachiaoffroadapp.com  CNAME                    -> Render frontend target
api.appalachiaoffroadapp.com  CNAME                    -> Render backend target
```

Render will show whether the root domain needs an `A`, `ALIAS`, or `ANAME`
record based on your DNS provider.

## Required Backend Env Vars

```env
DATABASE_URL=
FRONTEND_URL=https://appalachiaoffroadapp.com
ADMIN_PASSWORD=
RESEND_API_KEY=
EMAIL_FROM=Appalachia Offroad <support@appalachiaoffroadapp.com>
STRIPE_SECRET_KEY=
STRIPE_PRICE_LOCAL_BUSINESS=
STRIPE_PRICE_LODGING_PARTNER=
STRIPE_PRICE_FEATURED_PARTNER=
STRIPE_PRICE_MONTHLY_SPONSOR=
STRIPE_PRICE_CLEANER_PARTNER=
STRIPE_WEBHOOK_SECRET=
```

## Required Frontend Env Vars

```env
API_URL=https://api.appalachiaoffroadapp.com
NEXT_PUBLIC_API_URL=https://api.appalachiaoffroadapp.com
```

## Stripe Setup

Create recurring monthly prices:

- `$29` Local Business
- `$59` Lodging Partner
- `$99` Featured Partner
- `$149` Monthly Sponsor
- `$29.99` Cleaner Partner

Add the live price IDs to the backend env vars.

Create a Stripe webhook endpoint:

```text
https://api.appalachiaoffroadapp.com/api/subscriptions/webhook
```

Listen for:

```text
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
```

Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## Email Setup

Use Resend for business login emails.

1. Verify your sending domain in Resend.
2. Create an API key.
3. Set:

```env
RESEND_API_KEY=
EMAIL_FROM=Appalachia Offroad <support@appalachiaoffroadapp.com>
```

## Launch Smoke Test

After deploy:

1. Open `https://appalachiaoffroadapp.com`.
2. Open `/ride-areas/rush-ky` and confirm map and reviews load.
3. Submit a trail review.
4. Open `/admin`, unlock with `ADMIN_PASSWORD`, approve the pending review.
5. Open `/business/join` and start a Stripe checkout.
6. Confirm Stripe redirects to `/business/success`.
7. Confirm the backend logs show the Stripe webhook received.
8. Test business login email from `/business/login`.

## Before Sharing Publicly

- Replace founding partner placeholder listings with real business data.
- Set a strong `ADMIN_PASSWORD`.
- Use live Stripe keys, not test keys.
- Use a verified Resend sender domain.
- Add Terms, Privacy, Refund/Cancellation, and Contact pages.
