import Link from "next/link";
import type { RideArea } from "../lib/types";

type Props = {
  areas: RideArea[];
  activeSlug?: string;
  compact?: boolean;
};

type MapPoint = {
  label: string;
  latitude: number;
  longitude: number;
  href?: string;
};

type MapBounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

function getMapPoints(areas: RideArea[], activeArea?: RideArea): MapPoint[] {
  if (!activeArea) {
    return areas.map((area) => ({
      label: area.name,
      latitude: area.latitude,
      longitude: area.longitude,
      href: `/ride-areas/${area.slug}`,
    }));
  }

  const trailPoints = activeArea.trails
    .filter((trail) => typeof trail.latitude === "number" && typeof trail.longitude === "number")
    .map((trail) => ({
      label: trail.name,
      latitude: trail.latitude as number,
      longitude: trail.longitude as number,
      href: trail.url,
    }));

  return [
    {
      label: activeArea.name,
      latitude: activeArea.latitude,
      longitude: activeArea.longitude,
    },
    ...trailPoints,
  ];
}

function getMapBounds(points: MapPoint[]): MapBounds {
  const latitudes = points.map((item) => item.latitude);
  const longitudes = points.map((item) => item.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const latPad = Math.max((maxLat - minLat) * 0.18, 0.25);
  const lonPad = Math.max((maxLon - minLon) * 0.18, 0.25);

  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLon: minLon - lonPad,
    maxLon: maxLon + lonPad,
  };
}

function getMapUrl(bounds: MapBounds, activeArea?: RideArea) {
  const params = new URLSearchParams({
    bbox: [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat].join(","),
    layer: "mapnik",
  });

  if (activeArea) {
    params.set("marker", `${activeArea.latitude},${activeArea.longitude}`);
  }

  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
}

function getPinStyle(point: MapPoint, bounds: MapBounds) {
  const lonRange = bounds.maxLon - bounds.minLon || 1;
  const latRange = bounds.maxLat - bounds.minLat || 1;
  const left = ((point.longitude - bounds.minLon) / lonRange) * 100;
  const top = ((bounds.maxLat - point.latitude) / latRange) * 100;

  return {
    left: `${Math.min(Math.max(left, 3), 97)}%`,
    top: `${Math.min(Math.max(top, 5), 95)}%`,
  };
}

function getAreaSearch(area: RideArea, query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${query} near ${area.name} ${area.state}`,
  )}`;
}

export function RideAreaMap({ areas, activeSlug, compact = false }: Props) {
  const activeArea = areas.find((area) => area.slug === activeSlug);
  const mapPoints = getMapPoints(areas, activeArea);
  const mapBounds = getMapBounds(mapPoints);
  const trailPins = activeArea ? mapPoints.slice(1) : [];

  return (
    <section className={compact ? "trail-map-shell compact" : "trail-map-shell"}>
      {!compact ? (
        <div className="section-heading">
          <p>Live trail map</p>
          <h2>Zoom in on ride-area towns.</h2>
        </div>
      ) : null}
      <div className="trail-map-layout">
        <div className="trail-map" aria-label="Zoomable Appalachian ride-area map">
          <iframe
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={getMapUrl(mapBounds, activeArea)}
            title="Zoomable map of Appalachian ride areas"
          />
          {trailPins.length ? (
            <div className="trail-map-pins" aria-label="Trail pins on this map">
              {trailPins.map((pin) => (
                <a
                  href={pin.href}
                  key={`${pin.label}-${pin.latitude}-${pin.longitude}`}
                  rel="noreferrer"
                  style={getPinStyle(pin, mapBounds)}
                  target="_blank"
                  title={pin.label}
                >
                  <span />
                  <strong>{pin.label}</strong>
                </a>
              ))}
            </div>
          ) : null}
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
