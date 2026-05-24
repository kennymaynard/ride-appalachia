import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Appalachia Offroad App | Trails, Lodging, Food, Deals & Events",
  description:
    "Discover offroad trails, lodging, food, recovery services, events, and exclusive rider deals across Appalachia. Built for ATV, UTV, Jeep, and SxS riders.",
};

const howItWorks = [
  {
    title: "Find Trails",
    copy: "Browse Appalachian offroad trails, UTV trails, trail systems, map sources, and ride-area notes before you head out.",
  },
  {
    title: "Discover Local Spots",
    copy: "Find ATV lodging, offroad restaurants, fuel, campgrounds, outfitters, and Hatfield McCoy area businesses near the ride.",
  },
  {
    title: "Unlock Rider Deals",
    copy: "See trail town deals from local businesses that want ATV, UTV, Jeep, and SxS riders walking through the door.",
  },
];

const phoneScreens = ["Trail Map", "Local Listings", "Deals", "Events"];

const trustCards = [
  "Local businesses",
  "Rider-focused deals",
  "Trail-town discovery",
  "Appalachia-first platform",
];

const businessTypes = [
  "Lodging",
  "Restaurants",
  "Repair shops",
  "Recovery services",
  "Campgrounds",
  "Outfitters",
];

export default function Home() {
  return (
    <main className="home-base">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero-copy">
          <p className="eyebrow">The offroad home base for Appalachia</p>
          <h1 id="home-hero-title">Ride Appalachia Smarter</h1>
          <p>
            Find trails, food, lodging, recovery, events, and exclusive rider
            deals across Appalachia.
          </p>
          <div className="home-hero-actions" aria-label="Primary actions">
            <Link href="/business/join">List Your Business</Link>
          </div>
        </div>
        <div className="home-hero-panel" aria-label="Rider and business paths">
          <article>
            <span>Riders</span>
            <strong>Trails, places, events, and deals in one trip hub.</strong>
          </article>
          <article>
            <span>Businesses</span>
            <strong>Reach offroad riders with plans starting at $29/month.</strong>
          </article>
        </div>
      </section>

      <section className="home-section" aria-labelledby="how-it-works-title">
        <div className="home-section-heading">
          <p className="eyebrow">How it works</p>
          <h2 id="how-it-works-title">Everything Riders Need in One App</h2>
        </div>
        <div className="home-card-grid">
          {howItWorks.map((item) => (
            <article key={item.title} className="home-info-card">
              <span>{item.title}</span>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="business-owner-section" aria-labelledby="business-owner-title">
        <div>
          <p className="home-badge">Founding Business Partner spots available.</p>
          <h2 id="business-owner-title">Turn Riders Into Customers</h2>
          <p>
            Reach ATV, UTV, Jeep, and SxS riders actively planning trips through
            Appalachia. List your lodging, restaurant, repair shop, recovery
            service, campground, outfitter, or local business with plans
            starting at $29/month.
          </p>
          <div className="business-type-row" aria-label="Business categories">
            {businessTypes.map((type) => (
              <span key={type}>{type}</span>
            ))}
          </div>
        </div>
        <aside className="business-price-card" aria-label="Business listing price">
          <span>$29</span>
          <strong>per month</strong>
          <p>
            Get found by riders searching for ATV lodging, offroad restaurants,
            SxS repair and recovery, trail services, and local deals.
          </p>
          <Link href="/business/join">See Pricing Tiers</Link>
        </aside>
      </section>

      <section className="home-section app-screenshot-section" aria-labelledby="app-title">
        <div className="home-section-heading">
          <p className="eyebrow">In the app</p>
          <h2 id="app-title">Built for the Ride</h2>
        </div>
        <div className="phone-mockup-grid">
          {phoneScreens.map((screen) => (
            <article key={screen} className="phone-mockup">
              <div className="phone-mockup-screen">
                <span>{screen}</span>
                <div />
                <small>App screenshot placeholder</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section trust-section" aria-labelledby="trust-title">
        <div className="home-section-heading">
          <p className="eyebrow">Trust the route</p>
          <h2 id="trust-title">Built for Appalachia. Built for Riders.</h2>
        </div>
        <div className="trust-card-grid">
          {trustCards.map((card) => (
            <article key={card}>
              <strong>{card}</strong>
            </article>
          ))}
        </div>
        <div className="testimonial-grid" aria-label="Rider testimonials">
          <figure>
            <blockquote>
              This is where riders will check before they book cabins, pick a
              trail town, or look for recovery help.
            </blockquote>
            <figcaption>Rider testimonial placeholder</figcaption>
          </figure>
          <figure>
            <blockquote>
              A simple way for local businesses to show up when offroad traffic
              is already planning the trip.
            </blockquote>
            <figcaption>Business testimonial placeholder</figcaption>
          </figure>
        </div>
      </section>

      <section className="coverage-section" aria-labelledby="coverage-title">
        <div>
          <p className="eyebrow">Coverage</p>
          <h2 id="coverage-title">Serving the Appalachian Offroad Community</h2>
        </div>
        <p>
          Built around Kentucky, West Virginia, Virginia, Tennessee, Ohio, and
          surrounding trail towns. Appalachia Offroad helps riders find
          Appalachian offroad trails, UTV trails, ATV lodging, Hatfield McCoy
          area businesses, offroad restaurants, SxS repair and recovery, events,
          and trail town deals.
        </p>
      </section>

      <section className="final-home-cta" aria-labelledby="final-cta-title">
        <h2 id="final-cta-title">Ready to Ride Smarter?</h2>
        <div className="home-hero-actions" aria-label="Final actions">
          <Link href="/business/join">List Your Business</Link>
        </div>
      </section>
    </main>
  );
}
