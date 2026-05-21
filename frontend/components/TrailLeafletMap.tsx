"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
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
  const center: [number, number] = [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2,
  ];
  const visiblePoints = useMemo(
    () =>
      points.filter((point) =>
        point.activity === "Hiking" ? showHiking : showOhv,
      ),
    [points, showHiking, showOhv],
  );

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
        {visiblePoints.map((point, index) => (
          <Marker
            icon={makeIcon(point)}
            key={`${point.areaSlug}-${point.label}-${index}`}
            position={[point.latitude, point.longitude]}
          >
            <Tooltip direction="top" offset={[0, -12]} opacity={1} sticky>
              {point.label}
            </Tooltip>
            <Popup>
              <div className="trail-popup">
                <strong>{point.label}</strong>
                <span>
                  {point.areaName} • {point.activity} • {point.difficulty}
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
        <strong>{activeTitle}</strong>
        <span>
          {ohvCount} OHV / ride pins, {hikingCount} hiking pins, and rider review
          signals for the planning area.
        </span>
        <div className="trail-map-legend" aria-label="Map legend">
          <span><i /> OHV / ride</span>
          <span><i /> Hiking</span>
        </div>
      </div>
    </div>
  );
}
