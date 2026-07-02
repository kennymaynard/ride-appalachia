import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketplaceGrid } from "../../../components/MarketplaceGrid";
import { RideAreaMap } from "../../../components/RideAreaMap";
import { TrailPack } from "../../../components/TrailPack";
import { TrailReviews } from "../../../components/TrailReviews";
import { getListings, getTrailReviews } from "../../../lib/api";
import { rideAreas, trailReviews } from "../../../lib/sample-data";

export const dynamic = "force-dynamic";

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
  const riderPhotos = areaReviews.filter((review) => review.photoUrl);
  const primaryRiderPhoto = riderPhotos[0];

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

      <TrailPack area={area} listings={fallbackListings} />

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
                  <span>{trail.activity ? `${trail.activity} • ${trail.type}` : trail.type}</span>
                  <strong>{trail.difficulty}</strong>
                </div>
                <h3>{trail.name}</h3>
                <p>{trail.description}</p>
                <div className="trail-access">
                  <span>{trail.access}</span>
                  <div className="trail-actions">
                    <a href={trail.url} rel="noreferrer" target="_blank">
                      Trail Map
                    </a>
                    {trail.passUrl ? (
                      <a href={trail.passUrl} rel="noreferrer" target="_blank">
                        Passes / Rules
                      </a>
                    ) : null}
                  </div>
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
          <RideAreaMap areas={rideAreas} activeSlug={area.slug} compact reviews={areaReviews} />
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

        <details className="ride-area-accordion" open>
          <summary>
            <span>Parks and nature</span>
            <strong>State parks, campgrounds, photo spots, and waterfalls</strong>
          </summary>
          <div className="outdoor-stop-grid">
            {area.nearbyOutdoors.map((stop) => (
              <article key={`${stop.kind}-${stop.name}`}>
                {primaryRiderPhoto ? (
                  <figure className="outdoor-rider-photo">
                    <img
                      alt={primaryRiderPhoto.photoCaption || `${area.name} rider photo`}
                      src={primaryRiderPhoto.photoUrl}
                    />
                    <figcaption>{primaryRiderPhoto.photoCaption || `Added by ${primaryRiderPhoto.riderName}`}</figcaption>
                  </figure>
                ) : (
                  <div className="outdoor-photo-prompt">
                    <strong>Rider photo needed</strong>
                    <small>Be the first to add one after your trip.</small>
                  </div>
                )}
                <span>{stop.kind.replace("_", " ")}</span>
                <h3>{stop.name}</h3>
                <p>{stop.description}</p>
                <small>{stop.access}</small>
                <a href={stop.url} rel="noreferrer" target="_blank">
                  Open Map
                </a>
                <a href="#trail-reviews">Add Photo</a>
              </article>
            ))}
          </div>
        </details>
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
