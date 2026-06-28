import { getTrailMapSources, getTrailMapStatusLabel } from "../lib/trail-map-sources";
import type { RideArea } from "../lib/types";

type Props = {
  areas: RideArea[];
};

const statusOrder = ["download_ready", "available_public", "official_link", "needs_contact"];

export function TrailMapSourceChecklist({ areas }: Props) {
  const sources = getTrailMapSources(areas).sort(
    (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status),
  );
  const counts = sources.reduce<Record<string, number>>((memo, source) => {
    memo[source.status] = (memo[source.status] ?? 0) + 1;
    return memo;
  }, {});

  return (
    <section className="map-source-shell">
      <div className="map-source-stats" aria-label="Trail map source counts">
        {statusOrder.map((status) => (
          <article key={status}>
            <strong>{counts[status] ?? 0}</strong>
            <span>{getTrailMapStatusLabel(status as (typeof sources)[number]["status"])}</span>
          </article>
        ))}
      </div>

      <div className="map-source-list">
        {sources.map((source) => (
          <article className={`map-source-card is-${source.status}`} key={`${source.areaSlug}-${source.trailName}`}>
            <div>
              <span>
                {source.state} • {source.activity ?? "Trail"}
              </span>
              <h2>{source.trailName}</h2>
              <p>{source.areaName}</p>
            </div>
            <div className="map-source-status">
              <strong>{getTrailMapStatusLabel(source.status)}</strong>
              <span>{source.sourceLabel}</span>
            </div>
            <div>
              <h3>Contact / verify</h3>
              <p>{source.contactTarget}</p>
            </div>
            <ul>
              {source.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="map-source-actions">
              <a href="#in-app-map">
                View in app map
              </a>
              <a href={source.mapUrl} rel="noreferrer" target="_blank">
                Source reference
              </a>
              {source.passUrl ? (
                <a href={source.passUrl} rel="noreferrer" target="_blank">
                  Rules / passes
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
