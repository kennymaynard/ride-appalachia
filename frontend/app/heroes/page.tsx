import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Heroes of Appalachia | Appalachia Offroad App",
  description:
    "Support veteran-owned and first responder-owned businesses, verified discounts, hero rides, and outdoor organizations across Appalachia.",
};

const heroButtons = [
  ["Veteran Businesses", "#veteran-businesses"],
  ["First Responder Businesses", "#first-responder-businesses"],
  ["Veteran Discounts", "#hero-discounts"],
  ["Veteran Events", "#hero-events"],
  ["Resources", "#hero-resources"],
];

const veteranBusinesses = [
  {
    business: "Ridge Runner Cabins",
    branch: "U.S. Army",
    years: "2006-2014",
    bio: "Trail-friendly cabin host helping riders stage close to the mountains.",
    discount: "10% off weekday lodging for veterans and first responders.",
    phone: "Call",
  },
  {
    business: "Patriot Recovery & Repair",
    branch: "U.S. Marine Corps",
    years: "Optional",
    bio: "Mobile trail recovery, tire help, and basic repair support for weekend groups.",
    discount: "Free safety check with service call.",
    phone: "Call",
  },
];

const responderBusinesses = [
  {
    business: "Station House Grill",
    badge: "Fire",
    bio: "Firefighter-owned food stop serving riders, crews, and families.",
    discount: "Free coffee for on-duty first responders.",
  },
  {
    business: "Blue Line Trailer Parking",
    badge: "Law Enforcement",
    bio: "Secure rider parking and shuttle coordination near trail towns.",
    discount: "15% off weekend parking.",
  },
  {
    business: "Medic Mountain Rentals",
    badge: "EMS",
    bio: "Responder-owned gear and machine rental support for visiting riders.",
    discount: "Veteran ride package available.",
  },
];

const discounts = [
  "15% Off Lodging",
  "Free Coffee",
  "Veteran Ride Packages",
  "Free Parking",
  "Trail Discounts",
  "Repair Shop Priority",
];

const placeFilters = [
  "Veteran Owned",
  "First Responders",
  "Discounts",
  "Accessible",
  "Campgrounds",
  "Lodging",
  "Food",
  "Repair Shops",
];

const events = [
  "Poker Runs",
  "Memorial Day Ride",
  "Purple Heart Ride",
  "9/11 Ride",
  "Veteran Meetups",
  "Gold Star Ride",
  "Police Motorcycle Ride",
  "Firefighter Benefit Ride",
];

const organizations = [
  "We Defy Foundation",
  "DAV",
  "VFW",
  "American Legion",
  "Wounded Warrior Project",
  "Local Veteran Organizations",
];

const storyPrompts = [
  "My Story",
  "Military Photos",
  "Trail Photos",
  "Why They Ride",
  "Recovery Stories",
  "PTSD",
  "Photography",
  "Healing",
];

const resources = [
  "National Crisis Line",
  "VA",
  "PTSD",
  "Traumatic Brain Injury",
  "Service Dogs",
  "Adaptive Riding",
  "Outdoor Therapy",
  "Employment",
  "Benefits",
];

const badges = [
  "🇺🇸 Veteran Owned",
  "🚓 First Responder Owned",
  "💜 Purple Heart",
  "⭐ Gold Star Supporter",
  "❤️ Gives Back",
  "🏍 Veteran Friendly",
];

function BusinessActions() {
  return (
    <div className="heroes-card-actions">
      <Link href="/marketplace">Visit Website</Link>
      <Link href="/contact">Call</Link>
      <Link href="/ride-areas">Directions</Link>
    </div>
  );
}

export default function HeroesPage() {
  return (
    <main className="heroes-page">
      <section className="heroes-hero">
        <div className="heroes-overlay">
          <div className="heroes-content">
            <img
              src="/images/appalachia-offroad-veteran-owned.png"
              alt="Appalachia Offroad App Veteran Owned"
              className="heroes-logo"
            />
            <p className="heroes-badge">Veteran Owned & Operated</p>
            <h1>Heroes of Appalachia</h1>
            <p className="heroes-line">Supporting Those Who Serve. Connecting Those Who Explore.</p>
            <p className="heroes-subtitle">
              Honoring Veterans • First Responders • Gold Star Families
            </p>
            <blockquote>
              The freedom to explore these mountains exists because others chose to serve.
            </blockquote>
            <div className="heroes-buttons" aria-label="Heroes page sections">
              {heroButtons.map(([label, href]) => (
                <a key={href} href={href}>
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="heroes-section">
        <p className="heroes-kicker">Appalachia Offroad App</p>
        <h2>Supporting Those Who Serve</h2>
        <p>
          Appalachia Offroad proudly supports veteran-owned and first responder-owned
          businesses. These men and women have served our country, protected our
          communities, and now continue building something strong here in Appalachia.
        </p>
      </section>

      <section className="hero-verified-badge-section" id="hero-verified">
        <div className="hero-verified-inner">
          <div className="hero-verified-badge" aria-label="Hero Verified badge">
            <span>🛡️</span>
            <strong>Hero Verified</strong>
            <small>Appalachia Offroad</small>
          </div>
          <div className="hero-verified-text">
            <p className="hero-kicker">Exclusive Badge</p>
            <h2>Hero Verified</h2>
            <p>
              One badge for all who serve. Hero Verified businesses are owned by
              veterans, first responders, or service-minded members of our Appalachian
              community.
            </p>
            <div className="hero-tags">
              <span>Veterans</span>
              <span>Fire</span>
              <span>EMS</span>
              <span>Law Enforcement</span>
              <span>Dispatch</span>
            </div>
          </div>
        </div>
      </section>

      <section className="heroes-grid" aria-label="Hero program highlights">
        <article className="hero-card">
          <span>🇺🇸</span>
          <h3>Veteran-Owned Businesses</h3>
          <p>Find and support businesses owned by veterans across Eastern Kentucky and Appalachia.</p>
          <a href="#veteran-businesses">Browse Businesses</a>
        </article>
        <article className="hero-card">
          <span>🚒</span>
          <h3>First Responder-Owned Businesses</h3>
          <p>Support businesses owned by firefighters, law enforcement, EMS, dispatchers, and corrections.</p>
          <a href="#first-responder-businesses">Browse Businesses</a>
        </article>
        <article className="hero-card">
          <span>🛡️</span>
          <h3>Hero Verified</h3>
          <p>Verified veteran and first responder businesses receive a special badge inside the app.</p>
          <a href="#hero-verified">Learn More</a>
        </article>
        <article className="hero-card">
          <span>💥</span>
          <h3>Free Partner Membership</h3>
          <p>Business Partner Memberships are free for veteran-owned and first responder-owned businesses.</p>
          <Link href="/business/join">Join For Free</Link>
        </article>
      </section>

      <section className="heroes-directory-section" id="veteran-businesses">
        <div className="heroes-section-heading">
          <p className="heroes-kicker">Veteran-Owned Businesses</p>
          <h2>People Love Supporting Veteran Businesses</h2>
        </div>
        <div className="heroes-list-grid">
          {veteranBusinesses.map((business) => (
            <article className="heroes-list-card" key={business.business}>
              <span className="heroes-owned-badge">🟧 Veteran Owned</span>
              <h3>{business.business}</h3>
              <dl>
                <div>
                  <dt>Branch of Service</dt>
                  <dd>{business.branch}</dd>
                </div>
                <div>
                  <dt>Years Served</dt>
                  <dd>{business.years}</dd>
                </div>
              </dl>
              <p>{business.bio}</p>
              <strong>{business.discount}</strong>
              <BusinessActions />
            </article>
          ))}
        </div>
      </section>

      <section className="heroes-directory-section" id="first-responder-businesses">
        <div className="heroes-section-heading">
          <p className="heroes-kicker">First Responder Businesses</p>
          <h2>Fire, Law Enforcement, EMS, Dispatch, and Corrections</h2>
        </div>
        <div className="heroes-list-grid">
          {responderBusinesses.map((business) => (
            <article className="heroes-list-card" key={business.business}>
              <span className="heroes-owned-badge">{business.badge}</span>
              <h3>{business.business}</h3>
              <p>{business.bio}</p>
              <strong>{business.discount}</strong>
              <BusinessActions />
            </article>
          ))}
        </div>
      </section>

      <section className="heroes-directory-section" id="hero-discounts">
        <div className="heroes-section-heading">
          <p className="heroes-kicker">Military & First Responder Discounts</p>
          <h2>Search Verified Discounts</h2>
        </div>
        <div className="heroes-search-panel">
          <input aria-label="Search hero discounts" placeholder="Search lodging, food, parking, trails..." />
          <span>Verified Discount</span>
        </div>
        <div className="heroes-pill-grid">
          {discounts.map((discount) => (
            <article key={discount}>
              <strong>{discount}</strong>
              <span>Verified Discount</span>
            </article>
          ))}
        </div>
      </section>

      <section className="heroes-map-section" aria-labelledby="hero-places-title">
        <div>
          <p className="heroes-kicker">Veteran Friendly Places</p>
          <h2 id="hero-places-title">Filter the Map by Hero-Friendly Stops</h2>
          <div className="heroes-filter-list">
            {placeFilters.map((filter) => (
              <span key={filter}>✓ {filter}</span>
            ))}
          </div>
        </div>
        <div className="heroes-map-preview" aria-label="Veteran friendly map preview">
          <span>Hero-Friendly Appalachia</span>
          <b>Rush • Inez • Matewan • Harlan • Royal Blue</b>
        </div>
      </section>

      <section className="heroes-directory-section" id="hero-events">
        <div className="heroes-section-heading">
          <p className="heroes-kicker">Veteran Events</p>
          <h2>One Calendar for Rides That Give Back</h2>
        </div>
        <div className="heroes-event-grid">
          {events.map((event) => (
            <article key={event}>
              <span>Event</span>
              <strong>{event}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="heroes-directory-section">
        <div className="heroes-section-heading">
          <p className="heroes-kicker">Organizations We Support</p>
          <h2>Nonprofits Riders Can Rally Around</h2>
        </div>
        <div className="heroes-org-grid">
          {organizations.map((org) => (
            <article key={org}>
              <strong>{org}</strong>
              <p>Support outdoor access, recovery, benefits, community, and veteran service work.</p>
              <Link href="/contact">Donation Info</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="heroes-stories-section">
        <div>
          <p className="heroes-kicker">Stories From the Trail</p>
          <h2>Why They Ride</h2>
          <p>
            Veterans and first responders can share recovery stories, trail photos,
            military photos, and the moments that make these mountains part of healing.
          </p>
        </div>
        <div className="heroes-story-tags">
          {storyPrompts.map((prompt) => (
            <span key={prompt}>{prompt}</span>
          ))}
        </div>
      </section>

      <section className="heroes-directory-section" id="hero-resources">
        <div className="heroes-section-heading">
          <p className="heroes-kicker">Resources</p>
          <h2>Help, Healing, Benefits, and Outdoor Therapy</h2>
        </div>
        <div className="heroes-resource-grid">
          {resources.map((resource) => (
            <Link href="/contact" key={resource}>
              {resource}
            </Link>
          ))}
        </div>
      </section>

      <section className="heroes-badge-system">
        <div>
          <p className="heroes-kicker">Hero Badge System</p>
          <h2>Earn Badges Riders Can Filter By</h2>
        </div>
        <div className="heroes-badge-row">
          {badges.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      </section>

      <section className="heroes-two-column">
        <article>
          <p className="heroes-kicker">Give Back</p>
          <h2>Round Up to Support Outdoor Organizations</h2>
          <p>
            A future give-back option can let riders round up purchases or memberships
            to support veteran outdoor organizations.
          </p>
          <strong>$1 from every Premium Membership helps support veteran outdoor organizations.</strong>
        </article>
        <article>
          <p className="heroes-kicker">Ride With Heroes</p>
          <h2>Host Rides, Cleanups, Memorials, and Benefit Events</h2>
          <p>
            Veterans and first responders can create rides, host meetups, organize
            trail cleanups, and invite riders into events with a mission.
          </p>
          <Link href="/contact">Start a Hero Ride</Link>
        </article>
      </section>

      <section className="heroes-callout">
        <h2>You Served Us. Let Us Serve You.</h2>
        <p>
          If you own a veteran or first responder business, join Appalachia Offroad
          for free and get your business in front of riders exploring the mountains.
        </p>
        <Link href="/business/join" className="heroes-cta">
          Join For Free Today
        </Link>
      </section>
    </main>
  );
}
