import type { Metadata } from "next";
import Link from "next/link";
import { RideAreaFinder } from "../components/RideAreaFinder";
import { getEvents } from "../lib/api";
import { rideAreas } from "../lib/sample-data";

export const metadata: Metadata = {
  title: "Appalachia Offroad App | Trails, Lodging, Food, Deals & Events",
  description:
    "Discover offroad trails, lodging, food, recovery services, events, and exclusive rider deals across Appalachia. Built for ATV, UTV, Jeep, and SxS riders.",
};

export const revalidate = 300;

const quickRideTowns = ["Rush KY", "Harlan KY", "Matewan WV", "Pikeville KY"];
const planningFeatures = ["Trails", "Lodging", "Rentals", "Food", "Fuel", "Repairs", "Services", "Deals"];
const planningSteps = [
  { label: "Search", detail: "Start with a ride town or trail system." },
  { label: "Choose dates", detail: "Line up lodging, food, fuel, and backup." },
  { label: "Book & save", detail: "Keep the itinerary ready before service drops." },
];

export default async function Home() {
  const events = await getEvents({ verified: true }).catch(() => []);

  return (
    <main className="home-base">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero-copy">
          <p className="eyebrow">Appalachia trip command center</p>
          <h1 id="home-hero-title">Plan your entire off-road adventure.</h1>
          <p>
            Discover trails, build an itinerary, find rider-friendly stops,
            book the right place to stay, and save the plan before you lose service.
          </p>
          <div className="home-feature-strip" aria-label="What riders can plan">
            {planningFeatures.map((feature) => (
              <span key={feature}>{feature}</span>
            ))}
          </div>
          <div className="home-hero-actions" aria-label="Primary actions">
            <Link href="/planner">Plan a Trip</Link>
            <Link href="#ride-search">Search Ride Areas</Link>
            <Link href="/marketplace">Browse Stops</Link>
          </div>
        </div>
        <div className="home-hero-panel" aria-label="Popular ride towns">
          {quickRideTowns.map((town) => (
            <Link
              href={`/ride-areas?area=${encodeURIComponent(town)}`}
              key={town}
            >
              <span>Popular search</span>
              <strong>{town}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section trip-flow-section" aria-labelledby="trip-flow-title">
        <div className="home-section-heading">
          <p className="eyebrow">Plan your ride</p>
          <h2 id="trip-flow-title">Search. Build. Book. Ride.</h2>
        </div>
        <div className="trip-flow-grid">
          {planningSteps.map((step, index) => (
            <article key={step.label}>
              <span>{index + 1}</span>
              <h3>{step.label}</h3>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section rider-search-section" id="ride-search" aria-labelledby="ride-search-title">
        <div className="home-section-heading">
          <p className="eyebrow">Map, trails, and stops</p>
          <h2 id="ride-search-title">Search once. Build the ride.</h2>
        </div>
        <RideAreaFinder areas={rideAreas} listings={[]} />
      </section>

      {events.length ? <section className="home-section" aria-labelledby="next-rides-title"><div className="home-section-heading"><p className="eyebrow">Upcoming events</p><h2 id="next-rides-title">Next verified rides</h2></div><div className="trip-flow-grid">{events.slice(0, 3).map((event) => <article key={event.id}>{event.is_featured ? <span>Featured</span> : null}<h3>{event.title}</h3><p>{event.start_date} • {event.city}, {event.state}</p><Link href={`/trail-talk/rides/${event.slug}`}>View ride</Link></article>)}</div><div className="home-hero-actions"><Link href="/trail-talk">View All Rides</Link></div></section> : null}

      <section className="final-home-cta" aria-labelledby="final-cta-title">
        <h2 id="final-cta-title">Save the trip before you lose service.</h2>
        <div className="home-hero-actions" aria-label="Final actions">
          <Link href="/planner">Open Trip Planner</Link>
          <Link href="/rider/login">Rider Login</Link>
        </div>
      </section>
    </main>
  );
}
