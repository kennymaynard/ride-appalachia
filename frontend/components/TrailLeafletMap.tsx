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
import type { Business, Category } from "../lib/types";
import type { MapPoint } from "./RideAreaMap";

type Props = {
  activeTitle: string;
  bounds: [[number, number], [number, number]];
  hikingCount: number;
  ohvCount: number;
  points: MapPoint[];
  businesses?: Business[];
};

type BusinessLayer = Exclude<Category, "deals"> | "deals";

const businessLayerOptions: { id: BusinessLayer; label: string }[] = [
  { id: "food", label: "Food" },
  { id: "fuel", label: "Gas" },
  { id: "lodging", label: "Lodging" },
  { id: "repairs", label: "Repairs" },
  { id: "rentals", label: "Rentals" },
  { id: "deals", label: "Deals" },
];

const businessLayerLabels: Record<BusinessLayer, string> = {
  food: "Food",
  fuel: "Gas / Fuel",
  lodging: "Lodging",
  repairs: "Repairs",
  rentals: "Rentals",
  deals: "Deal",
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
  if (!point.routeLine.length) return "";

  const trackPoints = point.routeLine
    .map(
      (coordinate) =>
        `      <trkpt lat="${coordinate.latitude}" lon="${coordinate.longitude}"></trkpt>`,
    )
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
    <trkseg>
${trackPoints}
    </trkseg>
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
            type: "LineString",
            coordinates: point.routeLine.map((coordinate) => [
              coordinate.longitude,
              coordinate.latitude,
            ]),
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
    if (!point.routeLine.length) {
      map.setView([point.latitude, point.longitude], 13);
      return;
    }

    const bounds = L.latLngBounds(
      point.routeLine.map((coordinate) => [coordinate.latitude, coordinate.longitude]),
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

export function TrailLeafletMap({
  activeTitle,
  bounds,
  businesses = [],
  hikingCount,
  ohvCount,
  points,
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
  const [mapStyle, setMapStyle] = useState<"standard" | "topo">("topo");
  const [selectedTrailId, setSelectedTrailId] = useState<string>();
  const [userLocation, setUserLocation] = useState<[number, number]>();
  const [trackingStatus, setTrackingStatus] = useState("Track me");
  const center: [number, number] = [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2,
  ];
  const selectedTrail = points.find((point) => point.id === selectedTrailId);
  const hasExactRoute = Boolean(selectedTrail?.routeLine.length);
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
  const trailLine = hasExactRoute
    ? (selectedTrail?.routeLine.map((coordinate) => [
        coordinate.latitude,
        coordinate.longitude,
      ]) as [number, number][])
    : undefined;

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

  return (
    <div className="trail-leaflet-map">
      <div className="trail-layer-controls" aria-label="Trail map layers">
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
        {selectedTrail ? (
          <button type="button" onClick={() => setSelectedTrailId(undefined)}>
            Show all
          </button>
        ) : null}
        <button type="button" onClick={handleTrackMe}>
          {trackingStatus}
        </button>
        <button
          className={mapStyle === "topo" ? "is-active" : ""}
          type="button"
          onClick={() =>
            setMapStyle((current) => (current === "topo" ? "standard" : "topo"))
          }
        >
          {mapStyle === "topo" ? "Topo on" : "Topo off"}
        </button>
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
        {selectedTrail && hasExactRoute ? (
          <>
            <button type="button" onClick={handleDownloadGpx}>
              Download GPX
            </button>
            <button type="button" onClick={handleDownloadGeoJson}>
              GeoJSON
            </button>
          </>
        ) : null}
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
        {trailLine ? (
          <Polyline
            pathOptions={{
              color: selectedTrail?.activity === "Hiking" ? "#5cd68e" : "#f26a1b",
              opacity: 0.95,
              weight: 6,
            }}
            positions={trailLine}
          />
        ) : null}
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
                <p>{point.access}</p>
                <p>{point.reviewText}</p>
                <a href={point.href} rel="noreferrer" target="_blank">
                  Open official map
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
      </MapContainer>
      <div className="trail-map-overlay">
        {selectedTrail ? (
          <>
            <strong>{selectedTrail.label}</strong>
            <span>
              {selectedTrail.lengthMiles ? `${selectedTrail.lengthMiles} miles` : "Length pending"} • {selectedTrail.difficulty} •{" "}
              {selectedTrail.activity}
            </span>
            <p>{selectedTrail.access}</p>
            {hasExactRoute ? (
              <p>
                Exact route imported. Download GPX or GeoJSON before you lose
                service and open it in an offline GPS map app.
              </p>
            ) : (
              <p>
                Exact trail line has not been imported yet. Use the official map
                link for this trail until the GPX/KMZ file is loaded.
              </p>
            )}
            {selectedTrail.photoStops.length ? (
              <div className="trail-focus-stops">
                {selectedTrail.photoStops.map((stop) => (
                  <span key={stop.name}>{stop.name}</span>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <strong>{activeTitle}</strong>
            <span>
              {ohvCount} OHV / ride pins, {hikingCount} hiking pins, and{" "}
              {visibleBusinesses.length} partner pins for the planning area.
            </span>
            <div className="trail-map-legend" aria-label="Map legend">
              <span><i /> OHV / ride</span>
              <span><i /> Hiking</span>
              <span><i /> Partner</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
