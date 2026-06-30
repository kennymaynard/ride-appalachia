import type { Metadata } from "next";
import Link from "next/link";
import { RideAreaFinder } from "../components/RideAreaFinder";
import { getListings } from "../lib/api";
import { rideAreas } from "../lib/sample-data";

export const metadata: Metadata = {
  title: "Appalachia Offroad App | Trails, Lodging, Food, Deals & Events",
  description:
    "Discover offroad trails, lodging, food, recovery services, events, and exclusive rider deals across Appalachia. Built for ATV, UTV, Jeep, and SxS riders.",
};

export const dynamic = "force-dynamic";

const quickRideTowns = ["Rush KY", "Harlan KY", "Matewan WV", "Pikeville KY"];

export default async function Home() {
  const listings = await getListings("all");

  return (
    <main className="home-base">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero-copy">
          <p className="eyebrow">Start your ride plan</p>
          <h1 id="home-hero-title">Where are you riding?</h1>
          <p>
            Search a trail town, see nearby trails, then add lodging, food,
            fuel, repair, and deals to one saved trip.
          </p>
          <div className="home-hero-actions" aria-label="Primary actions">
            <Link href="#ride-search">Search Ride Areas</Link>
            <Link href="/planner">Plan a Trip</Link>
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

      <section className="home-section rider-search-section" id="ride-search" aria-labelledby="ride-search-title">
        <div className="home-section-heading">
          <p className="eyebrow">Map, trails, and stops</p>
          <h2 id="ride-search-title">Search once. Build the ride.</h2>
        </div>
        <RideAreaFinder areas={rideAreas} listings={listings} />
      </section>

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
