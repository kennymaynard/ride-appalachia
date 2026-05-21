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
import type { MapPoint } from "./RideAreaMap";

type Props = {
  activeTitle: string;
  bounds: [[number, number], [number, number]];
  hikingCount: number;
  ohvCount: number;
  points: MapPoint[];
};

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
    if (!point?.routeLine.length) return;
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

export function TrailLeafletMap({
  activeTitle,
  bounds,
  hikingCount,
  ohvCount,
  points,
}: Props) {
  const [showOhv, setShowOhv] = useState(true);
  const [showHiking, setShowHiking] = useState(true);
  const [selectedTrailId, setSelectedTrailId] = useState<string>();
  const [userLocation, setUserLocation] = useState<[number, number]>();
  const [trackingStatus, setTrackingStatus] = useState("Track me");
  const center: [number, number] = [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2,
  ];
  const selectedTrail = points.find((point) => point.id === selectedTrailId);
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
  const trailLine = selectedTrail?.routeLine.map((coordinate) => [
    coordinate.latitude,
    coordinate.longitude,
  ]) as [number, number][] | undefined;

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
      </div>
      <MapContainer
        center={center}
        maxZoom={16}
        minZoom={5}
        scrollWheelZoom
        zoom={7}
        zoomControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
                  {point.lengthMiles} mi
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
      </MapContainer>
      <div className="trail-map-overlay">
        {selectedTrail ? (
          <>
            <strong>{selectedTrail.label}</strong>
            <span>
              {selectedTrail.lengthMiles} miles • {selectedTrail.difficulty} •{" "}
              {selectedTrail.activity}
            </span>
            <p>{selectedTrail.access}</p>
            <div className="trail-focus-stops">
              {selectedTrail.photoStops.map((stop) => (
                <span key={stop.name}>{stop.name}</span>
              ))}
            </div>
          </>
        ) : (
          <>
            <strong>{activeTitle}</strong>
            <span>
              {ohvCount} OHV / ride pins, {hikingCount} hiking pins, and rider review
              signals for the planning area.
            </span>
            <div className="trail-map-legend" aria-label="Map legend">
              <span><i /> OHV / ride</span>
              <span><i /> Hiking</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
