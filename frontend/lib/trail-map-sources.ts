import type { RideArea, TrailInfo } from "./types";

export type TrailMapSourceStatus =
  | "download_ready"
  | "available_public"
  | "official_link"
  | "needs_contact";

export type TrailMapSource = {
  areaName: string;
  areaSlug: string;
  state: string;
  trailName: string;
  activity: TrailInfo["activity"];
  mapUrl: string;
  mapDataUrl?: string;
  passUrl?: string;
  sourceLabel: string;
  status: TrailMapSourceStatus;
  checklist: string[];
  contactTarget: string;
};

function includesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

export function getTrailMapSource(area: RideArea, trail: TrailInfo): TrailMapSource {
  const url = trail.url.toLowerCase();
  const type = trail.type.toLowerCase();
  const isDownload = includesAny(url, [".gpx", ".kmz", ".kml", ".geojson"]);
  const isPublicAgency = includesAny(url, [
    ".gov",
    "pa.gov",
    "tn.gov",
    "fs.usda.gov",
    "parks.ky.gov",
    "ncparks.gov",
  ]);
  const isKnownOfficialMap = includesAny(url, [
    "1stfrontier.org",
    "trailsheaven.com",
    "arcgis.com",
    "google.com/maps/d",
  ]);
  const isSearchFallback = includesAny(url, ["google.com/maps/search"]);
  const isPrivatePark = includesAny(url, [
    "rushoffroad.com",
    "brimstonerecreation.com",
    "buscobeach.com",
    "brushymountainpowersports.com",
  ]);
  const status: TrailMapSourceStatus = isDownload
    ? "download_ready"
    : isSearchFallback
      ? "needs_contact"
      : isPublicAgency || isKnownOfficialMap
        ? "available_public"
        : "official_link";
  const sourceLabel = isDownload
    ? "Downloadable map file"
    : isPublicAgency
      ? "Public agency map"
      : isKnownOfficialMap
        ? "Official public map"
        : isPrivatePark
          ? "Private park map"
          : isSearchFallback
            ? "Source needs verification"
            : "Map source";
  const contactTarget = isPublicAgency
    ? "Public land manager / agency GIS contact"
    : isPrivatePark
      ? "Private park or trail system operator"
      : isKnownOfficialMap
        ? "Map publisher / regional authority"
        : "Local tourism office or land manager";
  const checklist = isDownload
    ? [
        "Download source file",
        "Convert to GeoJSON",
        "Verify alignment on topo map",
        "Add exact route and offline download",
      ]
    : trail.mapDataUrl
      ? [
          "Open official Trail Heaven map data",
          "Download GPX/KMZ when available",
          "Check attribution/use requirements",
          "Import only verified route geometry",
        ]
    : status === "available_public"
      ? [
          "Confirm map is current",
          "Request GPX/KMZ/GeoJSON if not published",
          "Check attribution/use requirements",
          "Import only verified route geometry",
        ]
      : [
          "Find official map owner or land manager",
          "Request current route file and public-use permission",
          "Confirm open/closed trail status",
          "Replace temporary search link with official map",
        ];

  return {
    areaName: area.name,
    areaSlug: area.slug,
    state: area.state,
    trailName: trail.name,
    activity: trail.activity ?? (type.includes("hiking") ? "Hiking" : "OHV"),
    mapUrl: trail.url,
    mapDataUrl: trail.mapDataUrl,
    passUrl: trail.passUrl,
    sourceLabel,
    status,
    checklist,
    contactTarget,
  };
}

export function getTrailMapSources(areas: RideArea[]) {
  return areas.flatMap((area) =>
    area.trails.map((trail) => getTrailMapSource(area, trail)),
  );
}

export function getTrailMapStatusLabel(status: TrailMapSourceStatus) {
  if (status === "download_ready") return "Download ready";
  if (status === "available_public") return "Public map";
  if (status === "official_link") return "Official link";
  return "Contact needed";
}
