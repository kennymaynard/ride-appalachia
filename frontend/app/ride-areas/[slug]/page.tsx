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

      <section className="ride-area-detail-grid">
        <article>
          <p className="eyebrow">Best for</p>
          <div className="ride-area-tags">
            {area.bestFor.map((item) => (
              <small key={item}>{item}</small>
            ))}
          </div>
        </article>
        <article>
          <p className="eyebrow">Nearby towns</p>
          <div className="ride-area-tags">
            {area.nearbyTowns.map((town) => (
              <small key={town}>{town}</small>
            ))}
          </div>
        </article>
        <article>
          <p className="eyebrow">Plan checklist</p>
          <div className="ride-area-tags">
            {area.checklist.map((item) => (
              <small key={item}>{item}</small>
            ))}
          </div>
        </article>
      </section>

      <RideAreaMap areas={rideAreas} activeSlug={area.slug} />
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
