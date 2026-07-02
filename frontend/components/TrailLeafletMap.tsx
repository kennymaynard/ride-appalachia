"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { Business, Category, RideMapFeature, TrailReview } from "../lib/types";
import type { MapConditionReport, MapPoint } from "./RideAreaMap";

type Props = {
  activeTitle: string;
  bounds: [[number, number], [number, number]];
  hikingCount: number;
  ohvCount: number;
  points: MapPoint[];
  businesses?: Business[];
  features?: RideMapFeature[];
  riderPhotos?: TrailReview[];
  conditionReports?: MapConditionReport[];
};

type BusinessLayer = Exclude<Category, "deals"> | "deals";
type IntelligenceLayer = RideMapFeature["layer"];

const businessLayerOptions: { id: BusinessLayer; label: string }[] = [
  { id: "food", label: "Food" },
  { id: "fuel", label: "Gas" },
  { id: "lodging", label: "Lodging" },
  { id: "repairs", label: "Repairs" },
  { id: "rentals", label: "Rentals" },
  { id: "services", label: "Services" },
  { id: "deals", label: "Deals" },
];

const businessLayerLabels: Record<BusinessLayer, string> = {
  food: "Food",
  fuel: "Gas / Fuel",
  lodging: "Lodging",
  repairs: "Repairs",
  rentals: "Rentals",
  services: "Services",
  deals: "Deal",
};

const intelligenceLayerOptions: { id: IntelligenceLayer; label: string }[] = [
  { id: "condition", label: "Conditions" },
  { id: "cell", label: "Cell" },
  { id: "parking", label: "Parking" },
  { id: "difficulty", label: "Vehicle fit" },
  { id: "emergency", label: "Emergency" },
  { id: "scenic", label: "Photos" },
  { id: "offline", label: "Offline" },
  { id: "group", label: "Group" },
  { id: "passport", label: "Passport" },
  { id: "deal", label: "Deals" },
];

const intelligenceLayerLabels: Record<IntelligenceLayer, string> = {
  cell: "Cell service",
  condition: "Trail condition",
  deal: "Local deal",
  difficulty: "Vehicle fit",
  emergency: "Emergency",
  group: "Group ride",
  offline: "Offline pack",
  parking: "Trailer parking",
  passport: "Ride passport",
  scenic: "Photo / nature",
};

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function downloadTextFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildGpx(point: MapPoint) {
  if (!point.routeSegments.length) return "";

  const trackSegments = point.routeSegments
    .map((segment) => {
      const trackPoints = segment
        .map(
          (coordinate) =>
            `      <trkpt lat="${coordinate.latitude}" lon="${coordinate.longitude}"></trkpt>`,
        )
        .join("\n");
      return `    <trkseg>\n${trackPoints}\n    </trkseg>`;
    })
    .join("\n");
  const waypoints = point.photoStops
    .map(
      (stop) => `  <wpt lat="${stop.latitude}" lon="${stop.longitude}">
    <name>${escapeXml(stop.name)}</name>
    <desc>${escapeXml(stop.note)}</desc>
  </wpt>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Appalachia Offroad" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(point.label)}</name>
    <desc>${escapeXml(`${point.areaName} • ${point.lengthMiles ?? "Length pending"} miles • ${point.difficulty}`)}</desc>
  </metadata>
${waypoints}
  <trk>
    <name>${escapeXml(point.label)}</name>
    <desc>${escapeXml(point.access)}</desc>
${trackSegments}
  </trk>
</gpx>
`;
}

function buildGeoJson(point: MapPoint) {
  return JSON.stringify(
    {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            name: point.label,
            area: point.areaName,
            activity: point.activity,
            difficulty: point.difficulty,
            lengthMiles: point.lengthMiles,
            access: point.access,
            officialMap: point.href,
          },
          geometry: {
            type: point.routeSegments.length > 1 ? "MultiLineString" : "LineString",
            coordinates:
              point.routeSegments.length > 1
                ? point.routeSegments.map((segment) =>
                    segment.map((coordinate) => [
                      coordinate.longitude,
                      coordinate.latitude,
                    ]),
                  )
                : point.routeSegments[0]?.map((coordinate) => [
                    coordinate.longitude,
                    coordinate.latitude,
                  ]) ?? [],
          },
        },
        ...point.photoStops.map((stop) => ({
          type: "Feature",
          properties: {
            name: stop.name,
            note: stop.note,
            kind: "photo-stop",
          },
          geometry: {
            type: "Point",
            coordinates: [stop.longitude, stop.latitude],
          },
        })),
      ],
    },
    null,
    2,
  );
}

function FitBounds({ bounds }: { bounds: [[number, number], [number, number]] }) {
  const map = useMap();

  useEffect(() => {
    const mapElement = map.getContainer();
    const refreshMap = () => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 9 });
    };
    const scheduleRefresh = () => window.requestAnimationFrame(refreshMap);

    refreshMap();
    const frame = scheduleRefresh();
    const timers = [150, 350, 700, 1200].map((delay) =>
      window.setTimeout(refreshMap, delay),
    );
    const resizeObserver = new ResizeObserver(scheduleRefresh);
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          refreshMap();
        }
      },
      { threshold: 0.01 },
    );

    resizeObserver.observe(mapElement);
    intersectionObserver.observe(mapElement);
    window.addEventListener("resize", refreshMap);
    window.addEventListener("orientationchange", refreshMap);

    return () => {
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("resize", refreshMap);
      window.removeEventListener("orientationchange", refreshMap);
    };
  }, [bounds, map]);

  return null;
}

function TrailFocus({ point }: { point?: MapPoint }) {
  const map = useMap();

  useEffect(() => {
    if (!point) return;
    if (!point.routeSegments.length) {
      map.setView([point.latitude, point.longitude], 13);
      return;
    }

    const bounds = L.latLngBounds(
      point.routeSegments
        .flat()
        .map((coordinate) => [coordinate.latitude, coordinate.longitude] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [44, 44], maxZoom: 13 });
  }, [map, point]);

  return null;
}

function makeIcon(point: MapPoint) {
  const label = point.label.length > 28 ? `${point.label.slice(0, 25)}...` : point.label;
  const kindClass = point.activity === "Hiking" ? "is-hiking" : "is-ohv";

  return L.divIcon({
    className: `leaflet-trail-pin ${kindClass}`,
    html: `<span></span><strong>${label}</strong>`,
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function getBusinessLayer(business: Business): BusinessLayer {
  return business.category === "deals" ? "food" : business.category;
}

function hasActiveDeal(business: Business) {
  return business.deals?.some((deal) => deal.is_active) ?? false;
}

function makeBusinessIcon(business: Business) {
  const label = business.name.length > 24 ? `${business.name.slice(0, 21)}...` : business.name;
  const layer = getBusinessLayer(business);

  return L.divIcon({
    className: `leaflet-business-pin is-${layer}`,
    html: `<span></span><strong>${escapeXml(label)}</strong>`,
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function makeFeatureIcon(feature: RideMapFeature) {
  const label = feature.title.length > 24 ? `${feature.title.slice(0, 21)}...` : feature.title;

  return L.divIcon({
    className: `leaflet-feature-pin is-${feature.layer}`,
    html: `<span></span><strong>${escapeXml(label)}</strong>`,
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function formatConditionType(value: MapConditionReport["reportType"]) {
  return value.replaceAll("_", " ");
}

function makeConditionReportIcon(report: MapConditionReport) {
  const label = formatConditionType(report.reportType);

  return L.divIcon({
    className: `leaflet-condition-report-pin is-${report.reportType}`,
    html: `<span></span><strong>${escapeXml(label)}</strong>`,
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function getTrailColor(point: MapPoint) {
  return point.activity === "Hiking" ? "#5cd68e" : "#f26a1b";
}

function getTrailDash(point: MapPoint) {
  return point.routeAccuracy === "exact" ? undefined : "8 8";
}

export function TrailLeafletMap({
  bounds,
  businesses = [],
  features = [],
  points,
  riderPhotos = [],
  conditionReports = [],
}: Props) {
  const [showOhv, setShowOhv] = useState(true);
  const [showHiking, setShowHiking] = useState(true);
  const [businessLayers, setBusinessLayers] = useState<BusinessLayer[]>([
    "food",
    "fuel",
    "lodging",
    "repairs",
    "rentals",
    "deals",
  ]);
  const [intelligenceLayers, setIntelligenceLayers] = useState<IntelligenceLayer[]>([
    "condition",
    "parking",
    "emergency",
    "scenic",
    "deal",
  ]);
  const [mapStyle, setMapStyle] = useState<"roads" | "topo">("roads");
  const [selectedTrailId, setSelectedTrailId] = useState<string>();
  const [controlsOpen, setControlsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number]>();
  const [trackingStatus, setTrackingStatus] = useState("Track me");
  const center: [number, number] = [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2,
  ];
  const selectedTrail = points.find((point) => point.id === selectedTrailId);
  const hasExactRoute = Boolean(
    selectedTrail?.routeSegments.length && selectedTrail.routeAccuracy === "exact",
  );
  const visiblePoints = useMemo(
    () =>
      points.filter((point) =>
        selectedTrailId
          ? point.id === selectedTrailId
          : point.activity === "Hiking"
            ? showHiking
            : showOhv,
      ),
    [points, selectedTrailId, showHiking, showOhv],
  );
  const visibleBusinesses = useMemo(
    () =>
      selectedTrailId
        ? []
        : businesses.filter((business) => {
            const layer = getBusinessLayer(business);
            return (
              businessLayers.includes(layer) ||
              (businessLayers.includes("deals") && hasActiveDeal(business))
            );
          }),
    [businessLayers, businesses, selectedTrailId],
  );
  const visibleFeatures = useMemo(
    () =>
      selectedTrailId
        ? []
        : features.filter((feature) => intelligenceLayers.includes(feature.layer)),
    [features, intelligenceLayers, selectedTrailId],
  );
  const visibleConditionReports = useMemo(
    () =>
      selectedTrailId || !intelligenceLayers.includes("condition")
        ? []
        : conditionReports,
    [conditionReports, intelligenceLayers, selectedTrailId],
  );
  const photoByArea = useMemo(() => {
    const map = new Map<string, TrailReview>();
    riderPhotos.forEach((review) => {
      if (review.photoUrl && !map.has(review.areaSlug)) map.set(review.areaSlug, review);
    });
    return map;
  }, [riderPhotos]);
  const handleTrackMe = () => {
    if (!navigator.geolocation) {
      setTrackingStatus("Location unavailable");
      return;
    }

    setTrackingStatus("Finding you...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setTrackingStatus("Tracking on");
      },
      () => {
        setTrackingStatus("Allow location");
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 },
    );
  };
  const handleDownloadGpx = () => {
    if (!selectedTrail || !hasExactRoute) return;
    downloadTextFile(
      `${slugify(selectedTrail.label)}.gpx`,
      buildGpx(selectedTrail),
      "application/gpx+xml;charset=utf-8",
    );
  };
  const handleDownloadGeoJson = () => {
    if (!selectedTrail || !hasExactRoute) return;
    downloadTextFile(
      `${slugify(selectedTrail.label)}.geojson`,
      buildGeoJson(selectedTrail),
      "application/geo+json;charset=utf-8",
    );
  };
  const toggleBusinessLayer = (layer: BusinessLayer) => {
    setBusinessLayers((current) =>
      current.includes(layer)
        ? current.filter((item) => item !== layer)
        : [...current, layer],
    );
  };
  const toggleIntelligenceLayer = (layer: IntelligenceLayer) => {
    setIntelligenceLayers((current) =>
      current.includes(layer)
        ? current.filter((item) => item !== layer)
        : [...current, layer],
    );
  };

  return (
    <div className={isExpanded ? "trail-leaflet-map is-expanded" : "trail-leaflet-map"}>
      <div className="trail-layer-controls" aria-label="Trail map layers">
        <div className="trail-layer-primary">
          <button
            aria-pressed={isExpanded}
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded ? "Close map" : "Expand map"}
          </button>
          <button type="button" onClick={handleTrackMe}>
            {trackingStatus}
          </button>
          <button
            aria-expanded={controlsOpen}
            className={controlsOpen ? "is-active trail-layer-menu-toggle" : "trail-layer-menu-toggle"}
            type="button"
            onClick={() => setControlsOpen((current) => !current)}
          >
            Map layers
          </button>
          {selectedTrail ? (
            <button type="button" onClick={() => setSelectedTrailId(undefined)}>
              Show all
            </button>
          ) : null}
        </div>
        <div className={controlsOpen ? "trail-layer-drawer is-open" : "trail-layer-drawer"}>
          <span>Trails</span>
          <button
            className={showOhv ? "is-active" : ""}
            type="button"
            onClick={() => setShowOhv((current) => !current)}
          >
            OHV / ride
          </button>
          <button
            className={showHiking ? "is-active is-hiking" : "is-hiking"}
            type="button"
            onClick={() => setShowHiking((current) => !current)}
          >
            Hiking
          </button>
          <button
            className={mapStyle === "topo" ? "is-active" : ""}
            type="button"
            onClick={() =>
              setMapStyle((current) => (current === "topo" ? "roads" : "topo"))
            }
          >
            {mapStyle === "topo" ? "Topo map" : "Roads + towns"}
          </button>
          <span>Nearby</span>
          {businessLayerOptions.map((layer) => (
            <button
              className={
                businessLayers.includes(layer.id)
                  ? "is-active is-business"
                  : "is-business"
              }
              key={layer.id}
              type="button"
              onClick={() => toggleBusinessLayer(layer.id)}
            >
              {layer.label}
            </button>
          ))}
          <span>Ride intel</span>
          {intelligenceLayerOptions.map((layer) => (
            <button
              className={
                intelligenceLayers.includes(layer.id)
                  ? "is-active is-intel"
                  : "is-intel"
              }
              key={layer.id}
              type="button"
              onClick={() => toggleIntelligenceLayer(layer.id)}
            >
              {layer.label}
            </button>
          ))}
          {selectedTrail && hasExactRoute ? (
            <>
              <span>Save</span>
              <button type="button" onClick={handleDownloadGpx}>
                Download GPX
              </button>
              <button type="button" onClick={handleDownloadGeoJson}>
                GeoJSON
              </button>
            </>
          ) : null}
        </div>
      </div>
      <MapContainer
        center={center}
        maxZoom={16}
        minZoom={5}
        scrollWheelZoom
        zoom={7}
        zoomControl
      >
        {mapStyle === "topo" ? (
          <TileLayer
            attribution='Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, style &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
            maxZoom={17}
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        <FitBounds bounds={bounds} />
        <TrailFocus point={selectedTrail} />
        {!selectedTrail
          ? visiblePoints
              .filter((point) => point.routeSegments.length)
              .flatMap((point) =>
                point.routeSegments.map((segment, segmentIndex) => (
                  <Polyline
                    key={`route-${point.id}-${segmentIndex}`}
                    pathOptions={{
                      color: getTrailColor(point),
                      dashArray: getTrailDash(point),
                      opacity: point.routeAccuracy === "exact" ? 0.76 : 0.48,
                      weight: point.routeAccuracy === "exact" ? 4 : 3,
                    }}
                    positions={
                      segment.map((coordinate) => [
                        coordinate.latitude,
                        coordinate.longitude,
                      ]) as [number, number][]
                    }
                  />
                )),
              )
          : null}
        {selectedTrail?.routeSegments.flatMap((segment, segmentIndex) => (
          <Polyline
            key={`selected-route-${selectedTrail.id}-${segmentIndex}`}
            pathOptions={{
              color: getTrailColor(selectedTrail),
              dashArray: getTrailDash(selectedTrail),
              opacity: hasExactRoute ? 0.95 : 0.72,
              weight: 6,
            }}
            positions={
              segment.map((coordinate) => [
                coordinate.latitude,
                coordinate.longitude,
              ]) as [number, number][]
            }
          />
        ))}
        {selectedTrail?.photoStops.map((stop) => (
          <CircleMarker
            center={[stop.latitude, stop.longitude]}
            key={`${selectedTrail.id}-${stop.name}`}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#ff9d45",
              fillOpacity: 0.92,
              weight: 2,
            }}
            radius={7}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1} sticky>
              {stop.name}
            </Tooltip>
            <Popup>
              <div className="trail-popup">
                <strong>{stop.name}</strong>
                <p>{stop.note}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
        {userLocation ? (
          <CircleMarker
            center={userLocation}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#5d94ba",
              fillOpacity: 0.95,
              weight: 2,
            }}
            radius={8}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
              You are here
            </Tooltip>
          </CircleMarker>
        ) : null}
        {visiblePoints.map((point, index) => (
          <Marker
            icon={makeIcon(point)}
            key={`${point.areaSlug}-${point.label}-${index}`}
            eventHandlers={{
              click: () => setSelectedTrailId(point.id),
            }}
            position={[point.latitude, point.longitude]}
          >
            <Tooltip direction="top" offset={[0, -12]} opacity={1} sticky>
              {point.label}
            </Tooltip>
            <Popup>
              <div className="trail-popup">
                <strong>{point.label}</strong>
                <span>
                  {point.areaName} • {point.activity} • {point.difficulty} •{" "}
                  {point.lengthMiles ? `${point.lengthMiles} mi` : "Length pending"}
                </span>
                <span>
                  {point.routeAccuracy === "exact"
                    ? "Exact in-app route"
                    : "Approximate in-app planning line"}
                  {" "}• {point.sourceLabel}
                </span>
                <p>{point.access}</p>
                <p>{point.reviewText}</p>
                <a href={point.href} rel="noreferrer" target="_blank">
                  Open official map
                </a>
                <a href={`/ride-areas/${point.areaSlug}#trail-reviews`}>
                  Leave trail review
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
        {visibleBusinesses.map((business) => (
          <Marker
            icon={makeBusinessIcon(business)}
            key={`business-${business.id}`}
            position={[business.latitude as number, business.longitude as number]}
          >
            <Tooltip direction="top" offset={[0, -12]} opacity={1} sticky>
              {business.name}
            </Tooltip>
            <Popup>
              <div className="trail-popup">
                <strong>{business.name}</strong>
                <span>
                  {businessLayerLabels[getBusinessLayer(business)]} • {business.location}
                </span>
                <p>{business.description}</p>
                {hasActiveDeal(business) ? (
                  <p>
                    Deal: {business.deals.find((deal) => deal.is_active)?.title}
                  </p>
                ) : null}
                <a href={`/business/${business.slug}`}>View listing</a>
              </div>
            </Popup>
          </Marker>
        ))}
        {visibleFeatures.map((feature) => (
          <Marker
            icon={makeFeatureIcon(feature)}
            key={`feature-${feature.id}`}
            position={[feature.latitude, feature.longitude]}
          >
            <Tooltip direction="top" offset={[0, -12]} opacity={1} sticky>
              {feature.title}
            </Tooltip>
            <Popup>
              <div className="trail-popup">
                {(() => {
                  const riderPhoto = photoByArea.get(feature.areaSlug);
                  return riderPhoto ? (
                    <figure className="trail-popup-rider-photo">
                      <img
                        alt={riderPhoto.photoCaption || `${feature.areaName} rider photo`}
                        src={riderPhoto.photoUrl}
                      />
                      <figcaption>{riderPhoto.photoCaption || `Added by ${riderPhoto.riderName}`}</figcaption>
                    </figure>
                  ) : (
                    <div className="trail-popup-photo-prompt">
                      <strong>Rider photo needed</strong>
                      <span>Add one from this area.</span>
                    </div>
                  );
                })()}
                <strong>{feature.title}</strong>
                <span>
                  {intelligenceLayerLabels[feature.layer]} • {feature.areaName}
                </span>
                <p>{feature.summary}</p>
                <p>{feature.detail}</p>
                {feature.status ? <p>{feature.status}</p> : null}
                {feature.vehicleTypes?.length ? (
                  <p>Fits: {feature.vehicleTypes.join(", ")}</p>
                ) : null}
                <a href={`/ride-areas/${feature.areaSlug}#trail-reviews`}>
                  Add rider photo
                </a>
                {feature.url ? (
                  <a href={feature.url} rel="noreferrer" target="_blank">
                    Open
                  </a>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
        {visibleConditionReports.map((report) => (
          <Marker
            icon={makeConditionReportIcon(report)}
            key={`condition-report-${report.id}`}
            position={[report.latitude, report.longitude]}
          >
            <Tooltip direction="top" offset={[0, -12]} opacity={1} sticky>
              {formatConditionType(report.reportType)}
            </Tooltip>
            <Popup>
              <div className="trail-popup">
                <strong>{formatConditionType(report.reportType)}</strong>
                <span>
                  Rider report - {report.severity} - {report.areaName}
                </span>
                <p>{report.note || "Rider condition report."}</p>
                <p>{report.trailName || report.areaName}</p>
                <a href={`/ride-areas/${report.areaSlug}#trail-conditions`}>
                  Add condition report
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
