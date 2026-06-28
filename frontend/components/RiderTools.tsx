"use client";

import { useEffect, useMemo, useState } from "react";
import type { Business, RideArea, TrailInfo } from "../lib/types";

type Props = {
  areas: RideArea[];
  listings: Business[];
};

type SavedTrail = {
  id: string;
  areaName: string;
  trailName: string;
  difficulty: string;
  access: string;
};

type RideSession = {
  startedAt: number;
  endedAt: number;
  distanceMiles: number;
  points: number;
};

type TrackerState = {
  startedAt: number;
  lastLatitude?: number;
  lastLongitude?: number;
  distanceMiles: number;
  points: number;
};

type MapLayer = {
  id: string;
  label: string;
  query: string;
};

const savedTrailsKey = "aoa_saved_trails";
const rideHistoryKey = "aoa_ride_history";

const mapLayers: MapLayer[] = [
  { id: "food", label: "Food", query: "food" },
  { id: "fuel", label: "Gas / Fuel", query: "gas station fuel" },
  { id: "lodging", label: "Lodging", query: "cabins campgrounds hotels lodging" },
  { id: "repairs", label: "Repairs", query: "ATV UTV repair parts recovery" },
  { id: "rentals", label: "Rentals", query: "ATV UTV rentals" },
  { id: "deals", label: "Deals", query: "restaurants lodging fuel ATV deals" },
];

function trailId(area: RideArea, trail: TrailInfo) {
  return `${area.slug}:${trail.name}`;
}

function milesBetween(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) {
  const earthRadiusMiles = 3958.8;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLatitude = toRadians(toLatitude - fromLatitude);
  const deltaLongitude = toRadians(toLongitude - fromLongitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(fromLatitude)) *
      Math.cos(toRadians(toLatitude)) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(a));
}

function formatDuration(startedAt: number, endedAt = Date.now()) {
  const totalSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function hasBusinessCoordinates(business: Business) {
  return typeof business.latitude === "number" && typeof business.longitude === "number";
}

function businessMatchesLayer(business: Business, layerId: string) {
  return (
    business.category === layerId ||
    (layerId === "deals" && business.deals?.some((deal) => deal.is_active))
  );
}

export function RiderTools({ areas, listings }: Props) {
  const [selectedAreaSlug, setSelectedAreaSlug] = useState(areas[0]?.slug || "");
  const [selectedLayers, setSelectedLayers] = useState<string[]>(["food", "fuel", "lodging"]);
  const [savedTrails, setSavedTrails] = useState<SavedTrail[]>([]);
  const [rideHistory, setRideHistory] = useState<RideSession[]>([]);
  const [tracker, setTracker] = useState<TrackerState | null>(null);
  const [trackingStatus, setTrackingStatus] = useState("Ready");
  const [, setClockTick] = useState(0);

  const selectedArea = useMemo(
    () => areas.find((area) => area.slug === selectedAreaSlug) || areas[0],
    [areas, selectedAreaSlug],
  );
  const mapReadyListings = useMemo(
    () => listings.filter(hasBusinessCoordinates),
    [listings],
  );
  const selectedLayerPinCount = useMemo(
    () =>
      mapReadyListings.filter((business) =>
        selectedLayers.some((layerId) => businessMatchesLayer(business, layerId)),
      ).length,
    [mapReadyListings, selectedLayers],
  );

  useEffect(() => {
    setSavedTrails(JSON.parse(localStorage.getItem(savedTrailsKey) || "[]"));
    setRideHistory(JSON.parse(localStorage.getItem(rideHistoryKey) || "[]"));
  }, []);

  useEffect(() => {
    if (!tracker) return;

    const timer = window.setInterval(() => setClockTick((value) => value + 1), 1000);
    let watchId: number | null = null;

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setTracker((current) => {
            if (!current) return current;
            const nextDistance =
              current.lastLatitude === undefined || current.lastLongitude === undefined
                ? current.distanceMiles
                : current.distanceMiles +
                  milesBetween(
                    current.lastLatitude,
                    current.lastLongitude,
                    latitude,
                    longitude,
                  );
            return {
              ...current,
              lastLatitude: latitude,
              lastLongitude: longitude,
              distanceMiles: nextDistance,
              points: current.points + 1,
            };
          });
          setTrackingStatus("Tracking");
        },
        () => setTrackingStatus("Location permission needed"),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 },
      );
    } else {
      setTrackingStatus("Location unavailable");
    }

    return () => {
      window.clearInterval(timer);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [tracker?.startedAt]);

  function persistSavedTrails(nextSavedTrails: SavedTrail[]) {
    setSavedTrails(nextSavedTrails);
    localStorage.setItem(savedTrailsKey, JSON.stringify(nextSavedTrails));
  }

  function toggleTrail(area: RideArea, trail: TrailInfo) {
    const id = trailId(area, trail);
    if (savedTrails.some((savedTrail) => savedTrail.id === id)) {
      persistSavedTrails(savedTrails.filter((savedTrail) => savedTrail.id !== id));
      return;
    }

    persistSavedTrails([
      ...savedTrails,
      {
        id,
        areaName: area.name,
        trailName: trail.name,
        difficulty: trail.difficulty,
        access: trail.access,
      },
    ]);
  }

  function toggleLayer(layerId: string) {
    setSelectedLayers((current) =>
      current.includes(layerId)
        ? current.filter((item) => item !== layerId)
        : [...current, layerId],
    );
  }

  function getMapSearchUrl(query: string) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${query} near ${selectedArea?.name || "Appalachia"} ${selectedArea?.state || ""}`,
    )}`;
  }

  function startRide() {
    setTracker({
      startedAt: Date.now(),
      distanceMiles: 0,
      points: 0,
    });
    setTrackingStatus("Starting GPS");
  }

  function stopRide() {
    if (!tracker) return;
    const session = {
      startedAt: tracker.startedAt,
      endedAt: Date.now(),
      distanceMiles: tracker.distanceMiles,
      points: tracker.points,
    };
    const nextHistory = [session, ...rideHistory].slice(0, 8);
    setRideHistory(nextHistory);
    localStorage.setItem(rideHistoryKey, JSON.stringify(nextHistory));
    setTracker(null);
    setTrackingStatus("Ride saved");
  }

  if (!selectedArea) {
    return <p className="empty-state">Ride areas are still loading.</p>;
  }

  return (
    <div className="rider-tools-layout">
      <section className="rider-tool-panel rider-map-layer-panel">
        <div className="section-heading">
          <p>Map layers</p>
          <h2>Pick what to find nearby</h2>
        </div>
        <p className="field-help">
          Trail, hiking, and partner pins are shown on the map above. There are
          {` ${mapReadyListings.length} `}businesses with exact map pins, and
          {` ${selectedLayerPinCount} `}match your selected categories.
        </p>
        <div className="rider-layer-controls" aria-label="Nearby map layers">
          {mapLayers.map((layer) => (
            <button
              key={layer.id}
              className={selectedLayers.includes(layer.id) ? "is-active" : ""}
              type="button"
              onClick={() => toggleLayer(layer.id)}
            >
              {layer.label}
            </button>
          ))}
        </div>
        <div className="rider-layer-links">
          {mapLayers
            .filter((layer) => selectedLayers.includes(layer.id))
            .map((layer) => (
              <a href={getMapSearchUrl(layer.query)} key={layer.id} rel="noreferrer" target="_blank">
                Open {layer.label} Map
              </a>
            ))}
        </div>
      </section>

      <section className="rider-tool-panel">
        <div className="section-heading">
          <p>Saved trails</p>
          <h2>Build your ride list</h2>
        </div>
        <label>
          Ride area
          <select
            value={selectedAreaSlug}
            onChange={(event) => setSelectedAreaSlug(event.target.value)}
          >
            {areas.map((area) => (
              <option key={area.slug} value={area.slug}>
                {area.name}
              </option>
            ))}
          </select>
        </label>
        <div className="rider-trail-list">
          {selectedArea?.trails.slice(0, 12).map((trail) => {
            const isSaved = savedTrails.some(
              (savedTrail) => savedTrail.id === trailId(selectedArea, trail),
            );
            return (
              <article key={trail.name}>
                <div>
                  <span>{trail.difficulty}</span>
                  <h3>{trail.name}</h3>
                  <p>{trail.access}</p>
                </div>
                <button type="button" onClick={() => toggleTrail(selectedArea, trail)}>
                  {isSaved ? "Saved" : "Save"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rider-tool-panel ride-tracker-panel">
        <div className="section-heading">
          <p>Ride tracking</p>
          <h2>Start a ride</h2>
        </div>
        <div className="ride-stats">
          <article>
            <strong>{tracker ? formatDuration(tracker.startedAt) : "0s"}</strong>
            <span>Time</span>
          </article>
          <article>
            <strong>{(tracker?.distanceMiles || 0).toFixed(2)}</strong>
            <span>Miles</span>
          </article>
          <article>
            <strong>{tracker?.points || 0}</strong>
            <span>GPS points</span>
          </article>
        </div>
        <p className="field-help">{trackingStatus}</p>
        <button type="button" onClick={tracker ? stopRide : startRide}>
          {tracker ? "Stop And Save Ride" : "Start Ride"}
        </button>
      </section>

      <section className="rider-tool-panel">
        <div className="section-heading">
          <p>My trails</p>
          <h2>Saved ride ideas</h2>
        </div>
        {savedTrails.length ? (
          <div className="saved-trails-list">
            {savedTrails.map((trail) => (
              <article key={trail.id}>
                <span>{trail.areaName}</span>
                <strong>{trail.trailName}</strong>
                <p>{trail.difficulty} - {trail.access}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">Save trails to build a quick ride list.</p>
        )}
      </section>

      <section className="rider-tool-panel">
        <div className="section-heading">
          <p>Ride history</p>
          <h2>Recent tracks</h2>
        </div>
        {rideHistory.length ? (
          <div className="saved-trails-list">
            {rideHistory.map((ride) => (
              <article key={`${ride.startedAt}-${ride.endedAt}`}>
                <span>{new Date(ride.startedAt).toLocaleDateString()}</span>
                <strong>{ride.distanceMiles.toFixed(2)} miles</strong>
                <p>{formatDuration(ride.startedAt, ride.endedAt)} - {ride.points} GPS points</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">Tracked rides will save here on this device.</p>
        )}
      </section>
    </div>
  );
}
