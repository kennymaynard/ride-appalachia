import Link from "next/link";
import { MarketplaceGrid } from "../components/MarketplaceGrid";
import { RideAreaFinder } from "../components/RideAreaFinder";
import { categories, rideAreas } from "../lib/sample-data";
import { getTrailMapSources } from "../lib/trail-map-sources";
import { getListings } from "../lib/api";

const appCategories = [
  { href: "/lodging", label: "Stay", detail: "Cabins, lodges, campgrounds", icon: "icon-stay" },
  { href: "/ride-areas", label: "Rentals", detail: "ATV and UTV options", icon: "icon-rentals" },
  { href: "/?category=food", label: "Eat", detail: "Restaurants and rider meals", icon: "icon-eat" },
  { href: "/?category=repairs", label: "Repairs", detail: "Parts, tires, service", icon: "icon-repairs" },
  { href: "/?category=fuel", label: "Fuel", detail: "Gas, ice, supplies", icon: "icon-fuel" },
  { href: "/planner", label: "Plan", detail: "Offline trip builder", icon: "icon-events" },
  { href: "/deals", label: "Deals", detail: "Local offers", icon: "icon-deals" },
  { href: "/ride-areas", label: "Trails", detail: "Maps and Trail Packs", icon: "icon-trails" },
  { href: "/business", label: "Services", detail: "Business tools", icon: "icon-services" },
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
        <div className="app-home-header">
          <img src="/ride-appalachia-logo.png" alt="Appalachia Offroad" />
          <p>Ride more. Plan less.</p>
        </div>

        <Link className="app-search" href="/ride-areas">
          Search businesses, trails, maps, and places...
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

        <div className="app-action-row">
          <Link className="app-action-card primary" href="/ride-areas">
            <span>
              <strong>Find Trail Packs</strong>
              Official map sources, trail details, and nearby stops.
            </span>
          </Link>
          <Link className="app-action-card" href="/planner">
            <span>
              <strong>Build Offline Plan</strong>
              Save maps, notes, fuel, food, lodging, and backup stops.
            </span>
          </Link>
          <Link className="app-action-card" href="/business/join">
            <span>
              <strong>List Your Business</strong>
              Get discovered by riders before they arrive.
            </span>
          </Link>
        </div>

        <div className="app-home-copy">
          <div>
            <p className="eyebrow">Offline-ready Trail Packs</p>
            <h1>Pick the ride. Tap what you need. Keep it offline.</h1>
          </div>
          <p>
            Appalachia Offroad helps riders and hikers choose a trail area,
            save map sources, find nearby stops, and carry the trip plan when
            cell service disappears.
          </p>
        </div>

        <div className="app-proof-strip" aria-label="App coverage">
          <article><strong>{rideAreas.length}</strong><span>Ride and hike areas</span></article>
          <article><strong>{publicMapCount}</strong><span>Public map sources</span></article>
          <article><strong>{downloadableMapCount}</strong><span>Downloadable map files</span></article>
          <article><strong>Offline</strong><span>Saved notes and trip packs</span></article>
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
