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
      <section className="app-hero">
        <div className="app-hero-tabs" aria-label="Quick categories">
          <Link href="/lodging">Cabins, Lodges, Campgrounds</Link>
          <Link href="/ride-areas">ATV / UTV Rentals</Link>
          <Link href="/planner">Trail Packs</Link>
          <Link href="/deals">Rider Deals</Link>
        </div>

        <div className="app-hero-inner">
          <div className="phone-showcase" aria-hidden="true">
            <div className="phone-frame">
              <div className="phone-status">
                <span>9:41</span>
                <span>LTE</span>
              </div>
              <img src="/ride-appalachia-logo.png" alt="" />
              <div className="phone-search">Search businesses, trails, photos...</div>
              <div className="phone-grid">
                <span>Stay</span>
                <span>Rentals</span>
                <span>Eat</span>
                <span>Repairs</span>
                <span>Fuel</span>
                <span>Events</span>
                <span>Deals</span>
                <span>Trails</span>
                <span>Services</span>
              </div>
              <div className="phone-listing">
                <div />
                <span>
                  <strong>Featured Listing</strong>
                  Mountain View Cabin
                  <small>Cabin - 4.9</small>
                </span>
              </div>
            </div>
          </div>

          <div className="app-hero-copy">
            <p className="eyebrow">Offline-ready Trail Packs</p>
            <h1>Find the ride. Save the plan. Go offline.</h1>
            <p>
              Appalachia Offroad helps riders and hikers pick a trail area, save
              official map sources, find nearby stops, and keep the whole trip
              plan ready when service drops.
            </p>
            <div className="hero-actions">
              <Link href="/ride-areas">Find Trail Packs</Link>
              <Link href="/planner">Build Offline Plan</Link>
              <Link href="/business/join">List Your Business</Link>
            </div>
          </div>
        </div>

        <div className="app-proof-strip" aria-label="App coverage">
          <article>
            <strong>{rideAreas.length}</strong>
            <span>Ride and hike areas</span>
          </article>
          <article>
            <strong>{publicMapCount}</strong>
            <span>Public map sources</span>
          </article>
          <article>
            <strong>{downloadableMapCount}</strong>
            <span>Downloadable map files</span>
          </article>
          <article>
            <strong>Offline</strong>
            <span>Saved notes and trip packs</span>
          </article>
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
          <p>Local services</p>
          <h2>Verified rider stops will show here.</h2>
        </div>
        <MarketplaceGrid
          listings={featured.length ? featured : listings}
          emptyText="No verified local listings yet."
        />
      </section>
    </main>
  );
}
