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
- Stripe Connect payouts
- Automatic 3% booking fee to Appalachia Offroad
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
4. Stripe sends the business payout through Stripe Connect.
5. Appalachia Offroad keeps a 3% platform fee.

## Build Order

1. Add bookable listings to the business dashboard.
2. Add imported iCal URLs and availability checks.
3. Add rider date search.
4. Add request-to-book messages and status tracking.
5. Add Stripe Connect onboarding for businesses.
6. Add Checkout with a 3% application fee.
7. Add instant booking only after calendar sync is dependable.
