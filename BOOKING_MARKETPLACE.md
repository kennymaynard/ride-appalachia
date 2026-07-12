# Appalachia Offroad Booking Marketplace

## Goal

Allow partner businesses to accept request-to-book reservations through Appalachia Offroad while syncing availability from existing calendars.

## First Version

Start with request-to-book plus calendar sync. Add instant booking after imported calendar reliability is proven.

## Core Features

- Business dashboard for booking setup
- Multiple bookable listings per business
- iCal calendar sync for Airbnb, Vrbo, Booking.com, Google Calendar, and other iCal sources
- Date-based search for riders
- Stripe Connect Express for provider payout accounts
- Provider-paid reservations with no Appalachia Offroad booking fee
- Request-to-book first, instant booking later

## Main Tables Needed

- `businesses`
- `business_users`
- `bookable_listings`
- `listing_calendars`
- `bookings`
- `booking_payments`
- `booking_messages`
- `booking_reviews`

## Payment Flow

1. Rider submits a booking request.
2. Business approves the request.
3. Rider pays through Stripe Checkout.
4. Payment is processed through the business's connected Stripe account.
5. The business is responsible for payout settings, taxes, accounting, and refund decisions.

## Build Order

1. Add bookable listings to the business dashboard. Done in `0007_booking_marketplace`.
2. Add imported iCal URLs and availability checks. Calendar links, feed parsing, manual sync, Cron sync, and blocked date checks are in place.
3. Add rider date search.
4. Add request-to-book messages and status tracking. Request and approval status are in place.
5. Add Stripe Connect onboarding for businesses. Onboarding link creation is in place.
6. Add platform Checkout using Stripe Connect destination charges and provider payouts.
7. Add instant booking only after calendar sync is dependable.

## Current Limitation

Online reservation payments are collected through the Appalachia Offroad platform using Stripe Connect. The connected business receives the provider payout, while the platform may collect its booking fee before transferring the provider portion. Providers remain responsible for their business obligations, listing accuracy, applicable taxes, services, cancellations, and refunds under the partner agreement.

## Calendar Sync

Business owners can click Sync in the dashboard. Render Cron can also run `backend/scripts/sync_calendars.py` hourly to update every active iCal feed.
