import Link from "next/link";
import type { RideArea } from "../lib/types";

type Props = {
  areas: RideArea[];
};

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
