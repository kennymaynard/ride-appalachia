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
          <p className="eyebrow">Founding partner launch</p>
          <h1>Plan the ride weekend without the headache.</h1>
          <p>
            Appalachia Offroad helps ATV and UTV riders find lodging, food,
            rentals, repairs, fuel, and deals near Rush, Inez, Hatfield,
            Matewan, Harlan, and other ride-area towns.
          </p>
          <div className="hero-actions">
            <Link href="/ride-areas">Find Nearby</Link>
            <Link href="/planner">Build Trip Plan</Link>
            <Link href="/business/join">Become a Partner</Link>
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
