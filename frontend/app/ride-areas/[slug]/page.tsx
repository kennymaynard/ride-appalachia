import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketplaceGrid } from "../../../components/MarketplaceGrid";
import { RideAreaMap } from "../../../components/RideAreaMap";
import { TrailReviews } from "../../../components/TrailReviews";
import { getListings, getTrailReviews } from "../../../lib/api";
import { rideAreas, trailReviews } from "../../../lib/sample-data";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function RideAreaDetailPage({ params }: Props) {
  const { slug } = await params;
  const area = rideAreas.find((item) => item.slug === slug);

  if (!area) {
    notFound();
  }

  const nearbyListings = await getListings({
    category: "all",
    location: area.locationQuery,
  });
  const fallbackListings = nearbyListings.length
    ? nearbyListings
    : await getListings("all");
  let areaReviews = trailReviews.filter((review) => review.areaSlug === area.slug);
  try {
    const loadedReviews = await getTrailReviews(area.slug);
    areaReviews = loadedReviews.length ? loadedReviews : areaReviews;
  } catch {
    areaReviews = trailReviews.filter((review) => review.areaSlug === area.slug);
  }

  return (
    <main className="page">
      <section className="page-hero compact ride-area-hero">
        <p className="eyebrow">{area.state}</p>
        <h1>{area.name}</h1>
        <p>{area.description}</p>
        <div className="hero-actions">
          <Link href={`/planner?area=${encodeURIComponent(area.locationQuery)}`}>
            Build Plan For This Area
          </Link>
          <Link href="/ride-areas">All Ride Areas</Link>
        </div>
      </section>

      <section className="page-section ride-area-control-panel">
        <details className="ride-area-accordion" open>
          <summary>
            <span>Trails</span>
            <strong>Trails near {area.name}</strong>
          </summary>
          <div className="trail-list">
            {area.trails.map((trail) => (
              <article key={trail.name}>
                <div className="trail-list-topline">
                  <span>{trail.type}</span>
                  <strong>{trail.difficulty}</strong>
                </div>
                <h3>{trail.name}</h3>
                <p>{trail.description}</p>
                <div className="trail-access">
                  <span>{trail.access}</span>
                  <a href={trail.url} rel="noreferrer" target="_blank">
                    Verify Access
                  </a>
                </div>
              </article>
            ))}
          </div>
        </details>

        <details className="ride-area-accordion">
          <summary>
            <span>Map</span>
            <strong>Open map for {area.name}</strong>
          </summary>
          <RideAreaMap areas={rideAreas} activeSlug={area.slug} compact />
        </details>

        <div className="ride-area-detail-grid">
          <details className="ride-area-info-card">
            <summary>Best for</summary>
            <div className="ride-area-tags">
              {area.bestFor.map((item) => (
                <small key={item}>{item}</small>
              ))}
            </div>
          </details>
          <details className="ride-area-info-card">
            <summary>Nearby towns</summary>
            <div className="ride-area-tags">
              {area.nearbyTowns.map((town) => (
                <small key={town}>{town}</small>
              ))}
            </div>
          </details>
          <article className="ride-area-info-card">
            <p className="eyebrow">Plan checklist</p>
            <div className="ride-area-checklist">
              {area.checklist.map((item) => (
                <label key={item}>
                  <input type="checkbox" />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </article>
        </div>
      </section>

      <TrailReviews areaSlug={area.slug} areaName={area.name} reviews={areaReviews} />

      <section className="page-section">
        <div className="section-heading">
          <p>Nearby marketplace</p>
          <h2>Useful stops around {area.name}</h2>
        </div>
        <MarketplaceGrid
          listings={fallbackListings}
          emptyText="No nearby listings yet."
        />
      </section>
    </main>
  );
}
