# Phase 4 destination platform operations

## Weather

Event destination pages use the public Open-Meteo forecast API with event coordinates. Responses are cached in-process for 30 minutes and failures degrade to an unavailable message; event pages remain usable without weather. Coordinates are stored once on the event and existing business records—Phase 4 does not duplicate location data.

## Sponsored placements

`event_business_placements` links an approved business to an event, placement name, date window, approval status, and disclosure. A business subscription or payment never verifies an event. Only active, approved, in-window placements appear, and every paid placement is labeled. Organic businesses remain visible and are ranked after sponsored/partner entries by distance and rating.

Supported placement values are `top`, `sidebar`, `planner`, and `search`. Payment checkout automation is intentionally left on the existing Stripe subscription path; admins must approve the placement separately after payment state is confirmed.

## Media and discussion moderation

Rider comments, questions, photos, and video links default to `pending`. Only approved records appear publicly. Admin moderation uses `/api/admin/event-content/{discussion|media}/{id}/moderate`.

## Flyer generation

Verified events can generate Facebook, Instagram, Story, poster SVGs, and a printable PDF from the admin event panel. Unverified events are rejected. Flyers always include the official/verification link and a reminder to confirm details.

## Performance

- Destination data is fetched in one server-rendered request and revalidated every 15 minutes.
- Weather uses a 30-minute cache.
- Nearby businesses are radius-limited and images use browser lazy loading.
- Media and discussions are capped at 50 records per destination response.
