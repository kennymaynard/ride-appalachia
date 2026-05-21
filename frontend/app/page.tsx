import Link from "next/link";
import { MarketplaceGrid } from "../components/MarketplaceGrid";
import { RideAreaFinder } from "../components/RideAreaFinder";
import { categories, rideAreas } from "../lib/sample-data";
import { getListings } from "../lib/api";

export default async function Home() {
  const listings = await getListings("all");
  const featured = listings.filter((business) => business.is_featured);

  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">Trail map, trip planner, and local stops</p>
          <h1>Know the trail. Find the stops. Ride with a plan.</h1>
          <p>
            Appalachia Offroad shows riders nearby trail systems, trail names,
            reviews, lodging, food, fuel, repairs, rentals, and deals across
            Appalachian ride towns before the truck ever leaves the driveway.
          </p>
          <div className="hero-actions">
            <Link href="/ride-areas">Open Trail Map</Link>
            <Link href="/planner">Build Trip Plan</Link>
            <Link href="/business/join">Become a Partner</Link>
          </div>
          <div className="hero-feature-grid" aria-label="App features">
            <span>Interactive trail map</span>
            <span>Nearby lodging, food, fuel, and repairs</span>
            <span>Reviews and difficulty levels</span>
            <span>Business deals for riders</span>
          </div>
        </div>
      </section>

      <RideAreaFinder areas={rideAreas} listings={listings} />

      <section className="page-section marketplace-jump">
        <div className="section-heading">
          <p>Marketplace</p>
          <h2>Find what you need near the ride.</h2>
        </div>
        <details className="category-menu">
          <summary>Browse lodging, food, rentals, repair, fuel, and deals</summary>
          <div className="category-nav" aria-label="Marketplace categories">
            {categories.map((category) => (
              <Link key={category.value} href={category.href}>
                {category.label}
              </Link>
            ))}
          </div>
        </details>
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
