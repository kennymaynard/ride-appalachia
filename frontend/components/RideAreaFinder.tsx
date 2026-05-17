"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RideArea } from "../lib/types";

type Props = {
  areas: RideArea[];
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type RankedArea = RideArea & {
  distanceMiles?: number;
  matchReason: string;
};

const knownTravelCities: Array<Coordinates & { names: string[] }> = [
  { names: ["rush", "rush ky"], latitude: 38.33536, longitude: -82.78155 },
  { names: ["ashland", "ashland ky"], latitude: 38.4784, longitude: -82.6379 },
  { names: ["grayson", "grayson ky"], latitude: 38.3326, longitude: -82.9485 },
  { names: ["cannonsburg", "cannonsburg ky"], latitude: 38.3876, longitude: -82.7038 },
  { names: ["inez", "inez ky"], latitude: 37.8662, longitude: -82.5388 },
  { names: ["hatfield", "hatfield ky"], latitude: 37.6126, longitude: -82.2793 },
  { names: ["matewan", "matewan wv"], latitude: 37.6223, longitude: -82.1571 },
  { names: ["harlan", "harlan ky"], latitude: 36.8431, longitude: -83.3218 },
  { names: ["evarts", "evarts ky"], latitude: 36.8645, longitude: -83.1902 },
  { names: ["pikeville", "pikeville ky"], latitude: 37.4793, longitude: -82.5188 },
  { names: ["paintsville", "paintsville ky"], latitude: 37.8145, longitude: -82.8071 },
  { names: ["williamson", "williamson wv"], latitude: 37.6743, longitude: -82.2774 },
  { names: ["pioneer", "pioneer tn"], latitude: 36.4331, longitude: -84.3094 },
  { names: ["huntsville", "huntsville tn"], latitude: 36.4098, longitude: -84.4908 },
  { names: ["oneida", "oneida tn"], latitude: 36.4981, longitude: -84.5127 },
  { names: ["lafollette", "lafollette tn"], latitude: 36.3829, longitude: -84.1199 },
];

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceMiles(from: Coordinates, to: Coordinates) {
  const earthRadiusMiles = 3958.8;
  const latDistance = toRadians(to.latitude - from.latitude);
  const lonDistance = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(latDistance / 2) * Math.sin(latDistance / 2) +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(lonDistance / 2) *
      Math.sin(lonDistance / 2);

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function findKnownCity(value: string) {
  const normalizedValue = normalize(value);
  return knownTravelCities.find((city) =>
    city.names.some((name) => name === normalizedValue),
  );
}

function rankByCoordinates(areas: RideArea[], coordinates: Coordinates): RankedArea[] {
  return areas
    .map((area) => ({
      ...area,
      distanceMiles: distanceMiles(coordinates, {
        latitude: area.latitude,
        longitude: area.longitude,
      }),
      matchReason: "distance",
    }))
    .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0));
}

function rankByText(areas: RideArea[], city: string): RankedArea[] {
  const normalizedCity = normalize(city);
  if (!normalizedCity) {
    return areas.map((area) => ({ ...area, matchReason: "featured" }));
  }

  const matches = areas.filter((area) => {
    const searchable = [
      area.name,
      area.state,
      area.locationQuery,
      ...area.nearbyTowns,
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedCity);
  });

  return (matches.length ? matches : areas).map((area) => ({
    ...area,
    distanceMiles: undefined,
    matchReason: matches.length ? "city match" : "suggested",
  }));
}

export function RideAreaFinder({ areas }: Props) {
  const [travelCity, setTravelCity] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState("");
  const [hasSearchedCity, setHasSearchedCity] = useState(false);

  const rankedAreas = useMemo(() => {
    const knownCity = findKnownCity(travelCity);
    if (knownCity) return rankByCoordinates(areas, knownCity);
    if (coordinates) return rankByCoordinates(areas, coordinates);
    if (hasSearchedCity) return rankByText(areas, travelCity);
    return areas.map((area) => ({
      ...area,
      distanceMiles: undefined,
      matchReason: "featured",
    }));
  }, [areas, coordinates, hasSearchedCity, travelCity]);

  function useCurrentLocation() {
    setStatus("");

    if (!window.navigator.geolocation) {
      setStatus("Location is not available in this browser.");
      return;
    }

    window.navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setHasSearchedCity(false);
        setStatus("Showing ride areas closest to your current location.");
      },
      () => {
        setStatus("Location permission was blocked. Enter a travel city instead.");
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 },
    );
  }

  function searchTravelCity() {
    setCoordinates(null);
    setHasSearchedCity(true);
    setStatus(
      findKnownCity(travelCity)
        ? `Showing ride areas closest to ${travelCity}.`
        : "Showing the closest text matches from known ride towns.",
    );
  }

  return (
    <section className="ride-finder">
      <div>
        <p className="eyebrow">Find trails near me</p>
        <h2>Use your location or enter the city you are traveling to.</h2>
      </div>

      <div className="ride-finder-controls">
        <button type="button" onClick={useCurrentLocation}>
          Use My Location
        </button>
        <label>
          Traveling to
          <input
            placeholder="Inez KY, Matewan WV, Harlan KY..."
            value={travelCity}
            onChange={(event) => setTravelCity(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") searchTravelCity();
            }}
          />
        </label>
        <button type="button" onClick={searchTravelCity}>
          Search City
        </button>
      </div>

      {status ? <p className="ride-finder-status">{status}</p> : null}

      <div className="ride-finder-results">
        {rankedAreas.slice(0, 4).map((area) => (
          <article key={area.slug}>
            <div>
              <span>{area.matchReason}</span>
              <h3>{area.name}</h3>
              <p>
                {area.state}
                {area.distanceMiles !== undefined
                  ? ` • ${Math.round(area.distanceMiles)} miles away`
                  : ""}
              </p>
            </div>
            <div className="ride-area-actions">
              <Link href={`/ride-areas/${area.slug}`}>View Area</Link>
              <Link href={`/planner?area=${encodeURIComponent(area.locationQuery)}`}>
                Build Plan
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
