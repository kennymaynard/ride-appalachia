import Link from "next/link";

export function BookingMarketplaceSection() {
  return (
    <section className="booking-marketplace">
      <div className="booking-wrap">
        <p className="eyebrow">New partner feature</p>

        <h2>Bookings built for off-road businesses.</h2>

        <p className="booking-intro">
          Appalachia Offroad helps riders find available cabins, campgrounds,
          rentals, guides, and local services by date, then book directly
          through the app.
        </p>

        <div className="booking-feature-grid">
          <article className="booking-feature-card">
            <h3>Calendar Sync</h3>
            <p>
              Businesses can connect Airbnb, Vrbo, Booking.com, Google Calendar,
              or any iCal calendar so riders only see available dates.
            </p>
          </article>

          <article className="booking-feature-card">
            <h3>One Business Dashboard</h3>
            <p>
              Manage cabins, RV sites, rentals, guided rides, events, specials,
              photos, messages, and bookings from one simple dashboard.
            </p>
          </article>

          <article className="booking-feature-card">
            <h3>Stripe Connect Payments</h3>
            <p>
              Customers pay in the app. The business receives their payout
              automatically through its own connected Stripe account.
            </p>
          </article>

          <article className="booking-feature-card">
            <h3>Search by Date</h3>
            <p>
              Riders enter their trip dates and instantly see what is available:
              lodging, campsites, rentals, guides, and nearby partner businesses.
            </p>
          </article>
        </div>

        <div className="booking-flow-box">
          <h3>How It Works</h3>

          <div className="booking-steps">
            <div>
              <span>1</span>
              <p>Business creates a partner account.</p>
            </div>

            <div>
              <span>2</span>
              <p>Business connects Stripe for payouts.</p>
            </div>

            <div>
              <span>3</span>
              <p>Business adds listings and imports calendar links.</p>
            </div>

            <div>
              <span>4</span>
              <p>Riders search dates and book available listings.</p>
            </div>

            <div>
              <span>5</span>
              <p>Business gets paid automatically through Stripe Connect.</p>
            </div>
          </div>
        </div>

        <div className="booking-cta-box">
          <h3>For Partner Businesses</h3>
          <p>
            Turn your listing into a booking tool. Get more riders, more direct
            reservations, and track the value Appalachia Offroad brings your
            business.
          </p>

          <Link href="/business/join" className="booking-cta-button">
            Become a Booking Partner
          </Link>
        </div>
      </div>
    </section>
  );
}
