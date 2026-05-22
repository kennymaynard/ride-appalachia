import Link from "next/link";
import { MarketplaceGrid } from "../components/MarketplaceGrid";
import { RideAreaFinder } from "../components/RideAreaFinder";
import { categories, rideAreas } from "../lib/sample-data";
import { getTrailMapSources } from "../lib/trail-map-sources";
import { getListings } from "../lib/api";

const appCategories = [
  { href: "/ride-areas", label: "Trails", detail: "Maps", icon: "icon-trails" },
  { href: "/planner", label: "Plan", detail: "Offline", icon: "icon-events" },
  { href: "/lodging", label: "Stay", detail: "Cabins", icon: "icon-stay" },
  { href: "/?category=fuel", label: "Fuel", detail: "Supplies", icon: "icon-fuel" },
  { href: "/?category=food", label: "Eat", detail: "Meals", icon: "icon-eat" },
  { href: "/?category=repairs", label: "Repairs", detail: "Service", icon: "icon-repairs" },
  { href: "/ride-areas", label: "Rentals", detail: "ATV / UTV", icon: "icon-rentals" },
  { href: "/deals", label: "Deals", detail: "Offers", icon: "icon-deals" },
];

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
      <section className="app-home">
        <div className="app-screen">
          <div className="app-top-row">
            <img src="/ride-appalachia-logo.png" alt="Appalachia Offroad" />
            <Link href="/offline">Offline</Link>
          </div>

          <div className="app-location-card">
            <span>Appalachia Offroad</span>
            <h1>Where are you riding?</h1>
            <p>Find trails, lodging, fuel, food, repairs, rentals, and map downloads in one tap.</p>
          </div>

          <Link className="app-search" href="/ride-areas">
            Search trail area, town, business, or map
          </Link>

          <div className="app-category-grid" aria-label="App shortcuts">
            {appCategories.map((item) => (
              <Link key={item.label} href={item.href}>
                <span className={`landing-icon ${item.icon}`} aria-hidden="true" />
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </Link>
            ))}
          </div>

          <div className="app-section-title">
            <span>Start here</span>
            <Link href="/ride-areas">View all</Link>
          </div>

          <div className="app-ride-card">
            <div className="app-route-art" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div>
              <span className="app-card-kicker">Featured Trail Pack</span>
              <h2>Rush, Kentucky</h2>
              <p>Maps, reviews, trail names, nearby lodging, food, fuel, repairs, and offline notes.</p>
              <div>
                <small>{publicMapCount} public maps</small>
                <small>{downloadableMapCount} downloads</small>
              </div>
            </div>
            <Link href="/ride-areas/rush-ky">Open</Link>
          </div>

          <div className="app-needs-row">
            <Link href="/planner">
              <strong>Build my route</strong>
              <span>Save stops and backup plans before service drops.</span>
            </Link>
            <Link href="/map-sources">
              <strong>Map confidence</strong>
              <span>See which trail maps are official, public, or contact-needed.</span>
            </Link>
          </div>

          <div className="app-proof-strip" aria-label="App coverage">
            <article><strong>{rideAreas.length}</strong><span>Areas</span></article>
            <article><strong>{publicMapCount}</strong><span>Maps</span></article>
            <article><strong>{downloadableMapCount}</strong><span>Files</span></article>
            <article><strong>Offline</strong><span>Ready</span></article>
          </div>

          <nav className="app-bottom-tabs" aria-label="App shortcuts">
            <Link href="/ride-areas">Trails</Link>
            <Link href="/planner">Planner</Link>
            <Link href="/lodging">Stay</Link>
            <Link href="/deals">Deals</Link>
          </nav>
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
