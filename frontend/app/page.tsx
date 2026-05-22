import Link from "next/link";
import { MarketplaceGrid } from "../components/MarketplaceGrid";
import { categories, rideAreas } from "../lib/sample-data";
import { getTrailMapSources } from "../lib/trail-map-sources";
import { getListings } from "../lib/api";

const homepageCategories = [
  ["Lodging", "Cabins, lodges, campgrounds"],
  ["Food", "Restaurants and rider meals"],
  ["Fuel", "Gas, ice, supplies"],
  ["Repairs", "Parts, tires, emergency help"],
  ["Rentals", "ATV and UTV rentals"],
  ["Events", "Local rides and meetups"],
  ["Deals", "Rider discounts"],
  ["Trails", "Maps and Trail Packs"],
];

const pricingPlans = [
  ["Local Business", "$29/mo"],
  ["Lodging Partner", "$59/mo"],
  ["Featured Partner", "$99/mo"],
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

      <section className="homepage-category-strip" aria-label="What riders can find">
        {homepageCategories.map(([title, copy]) => (
          <article key={title}>
            <strong>{title}</strong>
            <span>{copy}</span>
          </article>
        ))}
      </section>

      <section className="homepage-phone-proof">
        <div>
          <p className="eyebrow">Plan. Ride. Explore.</p>
          <h2>All from your phone.</h2>
          <p>
            Open a Trail Pack, check map sources, save nearby stops, and keep
            your plan handy when service drops.
          </p>
        </div>
        <div className="mini-phone" aria-hidden="true">
          <div className="mini-search">Search trails, cabins, food...</div>
          <div className="mini-icon-grid">
            <span>Trails</span>
            <span>Stay</span>
            <span>Fuel</span>
            <span>Deals</span>
          </div>
          <div className="mini-listing">
            <strong>Rush Trail Pack</strong>
            <span>Maps, stops, notes, offline plan</span>
          </div>
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

      <section className="homepage-pricing">
        <div>
          <p className="eyebrow">Founding business pricing</p>
          <h2>Get in front of riders early.</h2>
        </div>
        <div className="homepage-pricing-grid">
          {pricingPlans.map(([name, price]) => (
            <article key={name}>
              <span>{name}</span>
              <strong>{price}</strong>
            </article>
          ))}
        </div>
        <Link href="/business/join">Lock In Founding Pricing</Link>
      </section>

      <section className="homepage-testimonials">
        <article>
          <p>"Exactly what Appalachia needed."</p>
          <span>ATV rider, Kentucky</span>
        </article>
        <article>
          <p>"Way easier than searching Facebook groups."</p>
          <span>Weekend rider</span>
        </article>
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
