import Link from "next/link";
import { getImportedTrailRouteSegments } from "../lib/imported-trail-routes";
import type { Business, RideArea, TrailCoordinate, TrailInfo, TrailPhotoStop, TrailReview } from "../lib/types";
import { getTrailMapSource, getTrailMapStatusLabel } from "../lib/trail-map-sources";
import { TrailMapShell } from "./TrailMapShell";

type Props = {
  areas: RideArea[];
  activeSlug?: string;
  businesses?: Business[];
  compact?: boolean;
  reviews?: TrailReview[];
};

export type MapPoint = {
  id: string;
  areaName: string;
  areaSlug: string;
  state: string;
  label: string;
  type: string;
  activity: "OHV" | "Hiking" | "Multi-use";
  difficulty: TrailInfo["difficulty"];
  access: string;
  latitude: number;
  longitude: number;
  href: string;
  lengthMiles?: number;
  photoStops: TrailPhotoStop[];
  routeLine: TrailCoordinate[];
  routeSegments: TrailCoordinate[][];
  routeAccuracy: "exact" | "approximate";
  sourceStatus: ReturnType<typeof getTrailMapSource>["status"];
  sourceLabel: string;
  reviewCount: number;
  reviewRating?: number;
  reviewSnippet?: string;
  reviewText: string;
};

type MapBounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

function getAreaReviewSummary(areaSlug: string, reviews: TrailReview[]) {
  const areaReviews = reviews.filter((review) => review.areaSlug === areaSlug);
  if (!areaReviews.length) return { count: 0 };

  return {
    count: areaReviews.length,
    rating:
      areaReviews.reduce((sum, review) => sum + review.rating, 0) /
      areaReviews.length,
    snippet: areaReviews[0]?.comment,
  };
}

function formatRating(count: number, rating?: number) {
  if (!rating) return "No rider reviews yet";
  return `${rating.toFixed(1)} from ${count} review${count === 1 ? "" : "s"}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getSeed(value: string) {
  return value.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

function buildApproximateRouteLine(area: RideArea, trail: TrailInfo, activity: MapPoint["activity"]): TrailCoordinate[] {
  const latitude = trail.latitude ?? area.latitude;
  const longitude = trail.longitude ?? area.longitude;
  const seed = getSeed(`${area.slug}-${trail.name}`);
  const direction = seed % 2 === 0 ? 1 : -1;
  const activityScale = activity === "Hiking" ? 0.018 : 0.038;
  const spread = activityScale + (seed % 5) * 0.004;
  const startLatitude = area.latitude;
  const startLongitude = area.longitude;

  if (Math.abs(startLatitude - latitude) < 0.004 && Math.abs(startLongitude - longitude) < 0.004) {
    return [
      { latitude: latitude - spread * 0.75, longitude: longitude - spread * direction },
      { latitude: latitude + spread * 0.25, longitude: longitude - spread * 0.55 * direction },
      { latitude: latitude + spread, longitude: longitude + spread * 0.2 * direction },
      { latitude: latitude + spread * 0.25, longitude: longitude + spread * direction },
      { latitude: latitude - spread * 0.75, longitude: longitude - spread * direction },
    ];
  }

  return [
    { latitude: startLatitude, longitude: startLongitude },
    {
      latitude: (startLatitude + latitude) / 2 + spread * 0.35,
      longitude: (startLongitude + longitude) / 2 + spread * direction,
    },
    { latitude, longitude },
    {
      latitude: latitude + spread * 0.5,
      longitude: longitude + spread * 0.55 * direction,
    },
  ];
}

function toMapPoint(area: RideArea, trail: TrailInfo, reviews: TrailReview[]): MapPoint {
  const reviewSummary = getAreaReviewSummary(area.slug, reviews);
  const activity = trail.activity ?? (trail.type.toLowerCase().includes("hiking") ? "Hiking" : "OHV");
  const source = getTrailMapSource(area, trail);
  const importedRouteSegments = getImportedTrailRouteSegments(area.slug, trail.name);
  const exactRouteLine = trail.routeLine ?? [];
  const routeSegments = importedRouteSegments.length
    ? importedRouteSegments
    : exactRouteLine.length
      ? [exactRouteLine]
      : [buildApproximateRouteLine(area, trail, activity)];

  return {
    id: `${area.slug}-${slugify(trail.name)}`,
    areaName: area.name,
    areaSlug: area.slug,
    state: area.state,
    label: trail.name,
    type: trail.type,
    activity,
    difficulty: trail.difficulty,
    access: trail.access,
    latitude: trail.latitude ?? area.latitude,
    longitude: trail.longitude ?? area.longitude,
    href: trail.url,
    lengthMiles: trail.lengthMiles,
    photoStops: trail.photoStops ?? [],
    routeLine: routeSegments.flat(),
    routeSegments,
    routeAccuracy: importedRouteSegments.length || exactRouteLine.length ? "exact" : "approximate",
    sourceStatus: source.status,
    sourceLabel: source.sourceLabel,
    reviewCount: reviewSummary.count,
    reviewRating: reviewSummary.rating,
    reviewSnippet: reviewSummary.snippet,
    reviewText: formatRating(reviewSummary.count, reviewSummary.rating),
  };
}

function getMapPoints(areas: RideArea[], reviews: TrailReview[], activeArea?: RideArea): MapPoint[] {
  const mappedAreas = activeArea ? [activeArea] : areas;
  return mappedAreas.flatMap((area) =>
    area.trails.map((trail) => toMapPoint(area, trail, reviews)),
  );
}

function hasBusinessCoordinates(business: Business) {
  return typeof business.latitude === "number" && typeof business.longitude === "number";
}

function getMapBounds(points: MapPoint[], businesses: Business[] = []): MapBounds {
  const businessesWithCoordinates = businesses.filter(hasBusinessCoordinates);
  const latitudes = [
    ...points.map((item) => item.latitude),
    ...businessesWithCoordinates.map((business) => business.latitude as number),
  ];
  const longitudes = [
    ...points.map((item) => item.longitude),
    ...businessesWithCoordinates.map((business) => business.longitude as number),
  ];
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

function getAreaSearch(area: RideArea, query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${query} near ${area.name} ${area.state}`,
  )}`;
}

function getLeafletBounds(bounds: MapBounds): [[number, number], [number, number]] {
  return [
    [bounds.minLat, bounds.minLon],
    [bounds.maxLat, bounds.maxLon],
  ];
}

export function RideAreaMap({
  areas,
  activeSlug,
  businesses = [],
  compact = false,
  reviews = [],
}: Props) {
  const activeArea = areas.find((area) => area.slug === activeSlug);
  const mapPoints = getMapPoints(areas, reviews, activeArea);
  const mapBusinesses = businesses.filter(hasBusinessCoordinates);
  const mapBounds = getMapBounds(mapPoints, mapBusinesses);
  const ohvCount = mapPoints.filter((point) => point.activity !== "Hiking").length;
  const hikingCount = mapPoints.filter((point) => point.activity === "Hiking").length;
  const visibleAreas = activeArea ? [activeArea] : areas;

  return (
    <section className={compact ? "trail-map-shell compact" : "trail-map-shell"}>
      {!compact ? (
        <div className="section-heading">
          <p>Live trail map</p>
          <h2>Trail names, reviews, and hiking options.</h2>
        </div>
      ) : null}
      <div className="trail-map-layout">
        <div className="trail-map" aria-label="Zoomable Appalachian ride-area map">
          <TrailMapShell
            activeTitle={activeArea ? activeArea.name : "Appalachia Offroad map"}
            bounds={getLeafletBounds(mapBounds)}
            hikingCount={hikingCount}
            ohvCount={ohvCount}
            points={mapPoints}
            businesses={mapBusinesses}
          />
        </div>

        <details className="trail-map-list" open>
          <summary>{activeArea ? "Trails on this map" : "Trail map index"}</summary>
          <div className="trail-map-list-inner">
            {visibleAreas.map((area) => (
              <article className={area.slug === activeSlug ? "is-active" : ""} key={area.slug}>
                <div>
                  <span>{area.state}</span>
                  <h3>{area.name}</h3>
                  <p>{area.headline}</p>
                </div>
                <div className="map-review-summary">
                  {(() => {
                    const summary = getAreaReviewSummary(area.slug, reviews);
                    return summary.count ? (
                      <>
                        <strong>{summary.rating?.toFixed(1)} rider rating</strong>
                        <p>{summary.snippet}</p>
                      </>
                    ) : (
                      <p>No rider reviews yet.</p>
                    );
                  })()}
                </div>
                <div className="map-trail-name-list" aria-label={`Trail names for ${area.name}`}>
                  {area.trails.map((trail) => {
                    const source = getTrailMapSource(area, trail);

                    return (
                      <a
                        className={trail.activity === "Hiking" ? "is-hiking" : "is-ohv"}
                        href={trail.url}
                        key={trail.name}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span>{trail.activity ?? "OHV"}</span>
                        <strong>{trail.name}</strong>
                        <small>{getTrailMapStatusLabel(source.status)}</small>
                      </a>
                    );
                  })}
                </div>
                <div className="availability-tags" aria-label={`Available planning options for ${area.name}`}>
                  {area.checklist.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <div className="ride-area-actions">
                  <Link href={`/ride-areas/${area.slug}`}>Details</Link>
                  <Link href={`/ride-areas/${area.slug}#trail-reviews`}>Review</Link>
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
                  <Link href="/map-sources">Map checklist</Link>
                  <a href={getAreaSearch(area, "food")} rel="noreferrer" target="_blank">
                    Food map
                  </a>
                  <a href={getAreaSearch(area, "fuel")} rel="noreferrer" target="_blank">
                    Fuel map
                  </a>
                  <a href={getAreaSearch(area, "ATV UTV repair")} rel="noreferrer" target="_blank">
                    Repair map
                  </a>
                  <a href={getAreaSearch(area, "state parks campgrounds waterfalls scenic overlooks")} rel="noreferrer" target="_blank">
                    Nature map
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
