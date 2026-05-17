import Link from "next/link";
import { MarketplaceGrid } from "../components/MarketplaceGrid";
import { RideAreaFinder } from "../components/RideAreaFinder";
import { RideAreaGrid } from "../components/RideAreaGrid";
import { RideAreaMap } from "../components/RideAreaMap";
import { categories, rideAreas } from "../lib/sample-data";
import { getListings } from "../lib/api";

export default async function Home() {
  const listings = await getListings("all");
  const featured = listings.filter((business) => business.is_featured);

  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">Founding partner launch</p>
          <h1>Plan the ride weekend without the headache.</h1>
          <p>
            Appalachia Offroad helps ATV and UTV riders find lodging, food,
            rentals, repairs, fuel, and deals near Rush, Inez, Hatfield,
            Matewan, Harlan, and other ride-area towns.
          </p>
          <div className="hero-actions">
            <Link href="/ride-areas">Find Ride Area</Link>
            <Link href="/planner">Build Trip Plan</Link>
            <Link href="/business/join">Become a Partner</Link>
          </div>
        </div>
      </section>

      <section className="launch-strip">
        <article>
          <strong>Now Building</strong>
          <span>Founding partner spots are open for rider-friendly local businesses.</span>
        </article>
        <article>
          <strong>For Riders</strong>
          <span>Pick a ride area, check what you need, and turn it into a trip plan.</span>
        </article>
        <article>
          <strong>For Businesses</strong>
          <span>Claim a listing, add specials, and sponsor the towns riders are searching.</span>
        </article>
      </section>

      <RideAreaFinder areas={rideAreas} />
      <RideAreaMap areas={rideAreas} />

      <section className="page-section">
        <div className="section-heading">
          <p>Ride areas</p>
          <h2>Where are you riding?</h2>
        </div>
        <RideAreaGrid areas={rideAreas.slice(0, 3)} />
      </section>

      <section className="category-nav" aria-label="Marketplace categories">
        {categories.map((category) => (
          <Link key={category.value} href={category.href}>
            {category.label}
          </Link>
        ))}
      </section>

      <section className="page-section">
        <div className="section-heading">
          <p>Founding partners</p>
          <h2>Ready for rider traffic</h2>
        </div>
        <MarketplaceGrid listings={featured.length ? featured : listings} />
      </section>
    </main>
  );
}
