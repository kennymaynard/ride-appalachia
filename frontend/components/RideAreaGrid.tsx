import Link from "next/link";
import type { RideArea } from "../lib/types";

type Props = {
  areas: RideArea[];
};

function getDifficultySummary(area: RideArea) {
  const difficulties = Array.from(new Set(area.trails.map((trail) => trail.difficulty)));
  return difficulties.length > 1 ? "Mixed" : difficulties[0] || "Verify";
}

function getVehicleSummary(area: RideArea) {
  const hasOhv = area.trails.some((trail) => (trail.activity || "OHV") === "OHV");
  const hasHiking = area.trails.some((trail) => trail.activity === "Hiking");
  if (hasOhv && hasHiking) return "ATV / UTV / Hike";
  if (hasHiking) return "Hike / Walk";
  return "ATV / UTV / Jeep";
}

export function RideAreaGrid({ areas }: Props) {
  return (
    <div className="ride-area-grid">
      {areas.map((area) => (
        <article className="ride-area-card" key={area.slug}>
          <div>
            <span>{area.state}</span>
            <h3>{area.name}</h3>
            <p>{area.headline}</p>
          </div>
          <dl className="ride-fact-grid" aria-label={`${area.name} quick facts`}>
            <div>
              <dt>Trails</dt>
              <dd>{area.trails.length}</dd>
            </div>
            <div>
              <dt>Difficulty</dt>
              <dd>{getDifficultySummary(area)}</dd>
            </div>
            <div>
              <dt>Vehicles</dt>
              <dd>{getVehicleSummary(area)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>Verify</dd>
            </div>
          </dl>
          <div className="ride-area-tags">
            {area.bestFor.slice(0, 3).map((tag) => (
              <small key={tag}>{tag}</small>
            ))}
          </div>
          <div className="ride-area-actions">
            <Link href={`/ride-areas/${area.slug}`}>Explore</Link>
            <Link href={`/planner?area=${encodeURIComponent(area.locationQuery)}`}>
              Build Plan
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
