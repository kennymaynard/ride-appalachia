import Link from "next/link";
import type { RideArea } from "../lib/types";

type Props = {
  areas: RideArea[];
  activeSlug?: string;
};

function getMapBounds(areas: RideArea[]) {
  const latitudes = areas.map((item) => item.latitude);
  const longitudes = areas.map((item) => item.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const latPad = Math.max((maxLat - minLat) * 0.18, 0.25);
  const lonPad = Math.max((maxLon - minLon) * 0.18, 0.25);

  return [
    minLon - lonPad,
    minLat - latPad,
    maxLon + lonPad,
    maxLat + latPad,
  ].join(",");
}

function getMapUrl(areas: RideArea[], activeArea?: RideArea) {
  const params = new URLSearchParams({
    bbox: getMapBounds(areas),
    layer: "mapnik",
  });

  if (activeArea) {
    params.set("marker", `${activeArea.latitude},${activeArea.longitude}`);
  }

  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
}

function getAreaSearch(area: RideArea, query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${query} near ${area.name} ${area.state}`,
  )}`;
}

export function RideAreaMap({ areas, activeSlug }: Props) {
  const activeArea = areas.find((area) => area.slug === activeSlug);

  return (
    <section className="trail-map-shell">
      <div className="section-heading">
        <p>Live trail map</p>
        <h2>Zoom in on ride-area towns.</h2>
      </div>
      <div className="trail-map-layout">
        <div className="trail-map" aria-label="Zoomable Appalachian ride-area map">
          <iframe
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={getMapUrl(areas, activeArea)}
            title="Zoomable map of Appalachian ride areas"
          />
          <div className="trail-map-overlay">
            <strong>{activeArea ? activeArea.name : "Appalachia Offroad map"}</strong>
            <span>Pan and zoom to inspect nearby towns, roads, lodging, food, and fuel.</span>
          </div>
        </div>

        <details className="trail-map-list" open>
          <summary>Available ride areas</summary>
          <div className="trail-map-list-inner">
            {areas.map((area) => (
              <article className={area.slug === activeSlug ? "is-active" : ""} key={area.slug}>
                <div>
                  <span>{area.state}</span>
                  <h3>{area.name}</h3>
                  <p>{area.headline}</p>
                </div>
                <div className="availability-tags" aria-label={`Available planning options for ${area.name}`}>
                  {area.checklist.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <div className="ride-area-actions">
                  <Link href={`/ride-areas/${area.slug}`}>Details</Link>
                  <Link href={`/planner?area=${encodeURIComponent(area.locationQuery)}`}>
                    Plan
                  </Link>
                  <Link href={`/lodging?area=${encodeURIComponent(area.locationQuery)}`}>
                    Lodging
                  </Link>
                  <Link href={`/deals?area=${encodeURIComponent(area.locationQuery)}`}>
                    Deals
                  </Link>
                </div>
                <div className="map-search-actions">
                  <a href={getAreaSearch(area, "food")} rel="noreferrer" target="_blank">
                    Food map
                  </a>
                  <a href={getAreaSearch(area, "fuel")} rel="noreferrer" target="_blank">
                    Fuel map
                  </a>
                  <a href={getAreaSearch(area, "ATV UTV repair")} rel="noreferrer" target="_blank">
                    Repair map
                  </a>
                </div>
              </article>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
