import Link from "next/link";
import { MarketplaceGrid } from "../components/MarketplaceGrid";
import { RideAreaFinder } from "../components/RideAreaFinder";
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
      <section className="hero">
        <div>
          <p className="eyebrow">Offline-ready Trail Packs</p>
          <h1>Pick a trail area. Save the maps, stops, and plan.</h1>
          <p>
            Appalachia Offroad helps riders and hikers build a Trail Pack with
            official map links, source confidence, nearby lodging, food, fuel,
            repairs, notes, and an offline plan for when service drops.
          </p>
          <div className="hero-actions">
            <Link href="/ride-areas">Find Trail Packs</Link>
            <Link href="/planner">Build Offline Plan</Link>
            <Link href="/business/join">Become a Partner</Link>
          </div>
          <div className="hero-feature-grid" aria-label="App features">
            <span>{rideAreas.length} ride and hike areas</span>
            <span>{publicMapCount} public map sources</span>
            <span>{downloadableMapCount} downloadable map files</span>
            <span>Offline trip packs with custom notes</span>
          </div>
        </div>
      </section>

      <section className="landing-steps" aria-label="How Appalachia Offroad works">
        <article>
          <strong>1</strong>
          <span>Choose an area</span>
          <p>Start with a town or trail system instead of hunting across tabs.</p>
        </article>
        <article>
          <strong>2</strong>
          <span>Build the Trail Pack</span>
          <p>Save official maps, source status, lodging, fuel, food, repairs, and notes.</p>
        </article>
        <article>
          <strong>3</strong>
          <span>Use it offline</span>
          <p>Open the pack from your phone when service gets thin.</p>
        </article>
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
