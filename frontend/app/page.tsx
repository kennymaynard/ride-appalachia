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

const phoneScreens = [
  {
    title: "Trail Map",
    rows: ["Rush Off-Road", "Hatfield-McCoy", "Royal Blue"],
    note: "Ride-area planning",
  },
  {
    title: "Local Listings",
    rows: ["Cabins", "Food", "Repair"],
    note: "Approved partners only",
  },
  {
    title: "Deals",
    rows: ["Rider discounts", "Trail-town offers", "Weekend specials"],
    note: "Business-submitted",
  },
  {
    title: "Events",
    rows: ["Rides", "Town weekends", "Meetups"],
    note: "Built for trip planning",
  },
];

const trustCards = [
  {
    title: "Real local partners",
    copy: "The public marketplace only shows approved businesses.",
  },
  {
    title: "Rider-focused deals",
    copy: "Offers are organized around trail trips, not generic coupons.",
  },
  {
    title: "Trail-town discovery",
    copy: "Built around where riders actually stage, eat, stay, and recover.",
  },
  {
    title: "Appalachia-first platform",
    copy: "Focused on Kentucky, West Virginia, Virginia, Tennessee, Ohio, and nearby riding towns.",
  },
];

const riderPath = [
  "Find trails and ride areas",
  "See lodging, food, fuel, rentals, and repair nearby",
  "Build and save a trip plan before you lose service",
];

const businessPath = [
  "Create or claim your business listing",
  "Show up for riders planning trips",
  "Update deals, photos, and business details anytime",
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
            <Link href="/ride-areas">Find Trails & Stops</Link>
            <Link href="/planner">Plan a Trip</Link>
            <Link href="/business">Business Side</Link>
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

      <section className="home-section" aria-labelledby="choose-side-title">
        <div className="home-section-heading">
          <p className="eyebrow">Choose your side</p>
          <h2 id="choose-side-title">One App. Two Clear Paths.</h2>
        </div>
        <div className="landing-path-grid">
          <article>
            <p className="eyebrow">Rider side</p>
            <h2>Plan the ride.</h2>
            <ul>
              {riderPath.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link href="/ride-areas">Enter Rider Side</Link>
          </article>
          <article>
            <p className="eyebrow">Business side</p>
            <h2>Reach riders.</h2>
            <ul>
              {businessPath.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link href="/business">Enter Business Side</Link>
          </article>
        </div>
      </section>

      <section className="home-section" aria-labelledby="how-it-works-title">
        <div className="home-section-heading">
          <p className="eyebrow">Rider side</p>
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

      <section className="home-section app-screenshot-section" aria-labelledby="app-title">
        <div className="home-section-heading">
          <p className="eyebrow">In the app</p>
          <h2 id="app-title">Built for the Ride</h2>
        </div>
        <div className="phone-mockup-grid">
          {phoneScreens.map((screen) => (
            <article key={screen.title} className="phone-mockup">
              <div className="phone-mockup-screen">
                <span>{screen.title}</span>
                <div>
                  {screen.rows.map((row) => (
                    <b key={row}>{row}</b>
                  ))}
                </div>
                <small>{screen.note}</small>
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
            <article key={card.title}>
              <strong>{card.title}</strong>
              <p>{card.copy}</p>
            </article>
          ))}
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
          <Link href="/ride-areas">Find Trails & Stops</Link>
          <Link href="/business">Business Side</Link>
        </div>
      </section>
    </main>
  );
}
