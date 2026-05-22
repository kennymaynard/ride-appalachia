import Link from "next/link";
import { MarketplaceGrid } from "../components/MarketplaceGrid";
import { categories, rideAreas } from "../lib/sample-data";
import { getTrailMapSources } from "../lib/trail-map-sources";
import { getListings } from "../lib/api";

export default async function Home() {
  const listings = await getListings("all");
  const featured = listings.filter((business) => business.is_featured);
  const mapSources = getTrailMapSources(rideAreas);
  const publicMapCount = mapSources.filter(
    (source) => source.status === "available_public",
  ).length;
  const downloadableMapCount = mapSources.filter(
    (source) => source.status === "download_ready",
  ).length;
  const featuredAreas = rideAreas
    .filter((area) =>
      ["rush-ky", "first-frontier-ky", "harlan-ky", "royal-blue-tn"].includes(
        area.slug,
      ),
    )
    .slice(0, 4);

  return (
    <main>
      <section className="simple-landing">
        <div className="simple-landing-logo">
          <img src="/ride-appalachia-logo.png" alt="Appalachia Offroad" />
        </div>
        <div className="simple-landing-copy">
          <p className="eyebrow">Ride. Stay. Explore.</p>
          <h1>The all-in-one off-road hub for Appalachia.</h1>
          <p>
            Find trails, cabins, food, fuel, rentals, repairs, events, and local
            deals all in one place.
          </p>
          <div className="hero-actions">
            <Link href="/ride-areas">Explore Trails</Link>
            <Link href="/business/join">List Your Business</Link>
          </div>
        </div>
        <div className="simple-feature-row" aria-label="What Appalachia Offroad does">
          <article>
            <strong>Find trails</strong>
            <span>Browse trail areas, map sources, names, reviews, and difficulty.</span>
          </article>
          <article>
            <strong>Plan stops</strong>
            <span>Add lodging, food, fuel, repairs, rentals, and notes.</span>
          </article>
          <article>
            <strong>Go offline</strong>
            <span>Save the plan before cell service gets thin.</span>
          </article>
        </div>
      </section>

      <section className="page-section trail-pack-preview">
        <div className="section-heading">
          <p>Trail Packs</p>
          <h2>Start with the area, then save the plan.</h2>
        </div>
        <div className="trail-pack-preview-grid">
          {featuredAreas.map((area) => {
            const sources = getTrailMapSources([area]);
            const downloads = sources.filter(
              (source) => source.status === "download_ready",
            ).length;
            const publicMaps = sources.filter(
              (source) => source.status === "available_public",
            ).length;

            return (
              <article key={area.slug}>
                <span>{area.state}</span>
                <h3>{area.name}</h3>
                <p>{area.headline}</p>
                <div>
                  <small>{area.trails.length} trails</small>
                  <small>{publicMaps} public maps</small>
                  <small>{downloads} downloads</small>
                </div>
                <Link href={`/ride-areas/${area.slug}`}>Open Trail Pack</Link>
              </article>
            );
          })}
        </div>
      </section>

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
          <p>Local services</p>
          <h2>Founding partners coming soon.</h2>
        </div>
        <MarketplaceGrid listings={featured.length ? featured : listings} />
      </section>
    </main>
  );
}
