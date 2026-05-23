"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Business, Category, RideArea, TrailInfo } from "../lib/types";
import { ListingCard } from "./ListingCard";

type Props = {
  areas: RideArea[];
  listings: Business[];
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type RankedArea = RideArea & {
  distanceMiles?: number;
  matchReason: string;
};

type NearbyTrail = TrailInfo & {
  area: RideArea;
  distanceMiles?: number;
};

type NearbyBusiness = Business & {
  distanceMiles?: number;
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

const marketplaceCategories: Array<{ label: string; value: Exclude<Category, "deals"> | "deals" }> = [
  { label: "Lodging", value: "lodging" },
  { label: "Food", value: "food" },
  { label: "Rentals", value: "rentals" },
  { label: "Repairs", value: "repairs" },
  { label: "Fuel", value: "fuel" },
  { label: "Deals", value: "deals" },
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

function findCityInText(value: string) {
  const normalizedValue = normalize(value);
  return knownTravelCities.find((city) =>
    city.names.some((name) => normalizedValue.includes(name)),
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

function getBusinessCoordinates(business: Business, areas: RideArea[]) {
  const directCity = findCityInText(business.location);
  if (directCity) return directCity;

  const area = areas.find((item) => {
    const haystack = [item.name, item.locationQuery, ...item.nearbyTowns]
      .join(" ")
      .toLowerCase();
    return haystack.includes(business.location.toLowerCase());
  });

  return area
    ? { latitude: area.latitude, longitude: area.longitude }
    : undefined;
}

function isSponsoredOrFeatured(business: Business) {
  return (
    business.is_featured ||
    business.subscription_tier === "featured_partner" ||
    business.subscription_tier === "monthly_sponsor" ||
    business.campaigns.some((campaign) => campaign.status === "active")
  );
}

function getSearchCoordinates(city: string, coordinates: Coordinates | null) {
  return findKnownCity(city) ?? coordinates;
}

function getMarketplaceHref(category: Category | "deals", location: string, radius: number) {
  const base = category === "lodging" ? "/lodging" : category === "deals" ? "/deals" : "/";
  const params = new URLSearchParams();
  if (category !== "lodging" && category !== "deals") params.set("category", category);
  if (location) params.set("area", location);
  params.set("radius", String(radius));

  return `${base}?${params.toString()}`;
}

export function RideAreaFinder({ areas, listings }: Props) {
  const [travelCity, setTravelCity] = useState("");
  const [radiusMiles, setRadiusMiles] = useState(50);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState("");
  const [hasSearchedCity, setHasSearchedCity] = useState(false);
  const searchCoordinates = getSearchCoordinates(travelCity, coordinates);

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

  const nearbyTrails = useMemo<NearbyTrail[]>(() => {
    const trails = areas.flatMap((area) =>
      area.trails.map((trail) => {
        const trailCoordinates =
          typeof trail.latitude === "number" && typeof trail.longitude === "number"
            ? { latitude: trail.latitude, longitude: trail.longitude }
            : { latitude: area.latitude, longitude: area.longitude };
        const distance = searchCoordinates
          ? distanceMiles(searchCoordinates, trailCoordinates)
          : undefined;

        return {
          ...trail,
          area,
          distanceMiles: distance,
        };
      }),
    );

    const filtered = searchCoordinates
      ? trails.filter((trail) => (trail.distanceMiles ?? 0) <= radiusMiles)
      : hasSearchedCity
        ? trails.filter((trail) => {
            const searchText = [trail.name, trail.area.name, trail.area.state, ...trail.area.nearbyTowns]
              .join(" ")
              .toLowerCase();
            return searchText.includes(normalize(travelCity));
          })
        : trails;

    return filtered
      .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0))
      .slice(0, 10);
  }, [areas, hasSearchedCity, radiusMiles, searchCoordinates, travelCity]);

  const nearbyListings = useMemo<NearbyBusiness[]>(() => {
    const ranked = listings.map((business) => {
      const businessCoordinates = getBusinessCoordinates(business, areas);
      const distance =
        searchCoordinates && businessCoordinates
          ? distanceMiles(searchCoordinates, businessCoordinates)
          : undefined;

      return {
        ...business,
        distanceMiles: distance,
      };
    });

    const filtered = searchCoordinates
      ? ranked.filter((business) => business.distanceMiles === undefined || business.distanceMiles <= radiusMiles)
      : hasSearchedCity
        ? ranked.filter((business) =>
            [business.location, business.name, business.description]
              .join(" ")
              .toLowerCase()
              .includes(normalize(travelCity)),
          )
        : ranked;

    return filtered.sort((a, b) => {
      const featuredDelta = Number(isSponsoredOrFeatured(b)) - Number(isSponsoredOrFeatured(a));
      if (featuredDelta) return featuredDelta;
      return (a.distanceMiles ?? 9999) - (b.distanceMiles ?? 9999);
    });
  }, [areas, hasSearchedCity, listings, radiusMiles, searchCoordinates, travelCity]);

  const featuredNearbyListings = useMemo(
    () => nearbyListings.filter(isSponsoredOrFeatured).slice(0, 3),
    [nearbyListings],
  );
  const previewNearbyListings = featuredNearbyListings.length
    ? featuredNearbyListings
    : nearbyListings.slice(0, 3);

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
        ? `Showing trails and stops within ${radiusMiles} miles of ${travelCity}.`
        : "Showing matches from known ride towns. Use a nearby town for mileage results.",
    );
  }

  return (
    <section className="ride-finder">
      <div>
        <p className="eyebrow">Find trails near me</p>
        <h2>Use your location or enter the city you are traveling to.</h2>
      </div>

      <div className="ride-finder-controls">
        <label>
          Where are you traveling?
          <input
            placeholder="Rush KY, Inez KY, Matewan WV..."
            value={travelCity}
            onChange={(event) => setTravelCity(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") searchTravelCity();
            }}
          />
        </label>
        <label>
          How far?
          <select
            value={radiusMiles}
            onChange={(event) => setRadiusMiles(Number(event.target.value))}
          >
            <option value={25}>25 miles</option>
            <option value={50}>50 miles</option>
            <option value={75}>75 miles</option>
            <option value={100}>100 miles</option>
            <option value={150}>150 miles</option>
          </select>
        </label>
        <button type="button" onClick={searchTravelCity}>
          Find Nearby
        </button>
        <button type="button" onClick={useCurrentLocation}>
          Use My Location
        </button>
      </div>

      {status ? <p className="ride-finder-status">{status}</p> : null}

      <div className="location-results">
        <details className="location-result-group" open>
          <summary>
            <span>Trails</span>
            <strong>{nearbyTrails.length} nearby trail options</strong>
          </summary>
          <div className="nearby-trail-list">
            {nearbyTrails.map((trail) => (
              <article key={`${trail.area.slug}-${trail.name}`}>
                <div>
                  <span>{trail.activity ? `${trail.activity} • ${trail.area.name}` : trail.area.name}</span>
                  <h3>{trail.name}</h3>
                  <p>
                    {trail.access}
                    {trail.distanceMiles !== undefined
                      ? ` • ${Math.round(trail.distanceMiles)} miles`
                      : ""}
                  </p>
                </div>
                <div className="trail-actions">
                  <a href={trail.url} rel="noreferrer" target="_blank">
                    Trail Map
                  </a>
                  {trail.passUrl ? (
                    <a href={trail.passUrl} rel="noreferrer" target="_blank">
                      Passes / Rules
                    </a>
                  ) : null}
                  <Link href={`/planner?area=${encodeURIComponent(trail.area.locationQuery)}`}>
                    Plan
                  </Link>
                </div>
              </article>
            ))}
            {!nearbyTrails.length ? (
              <p className="empty-state">No trail matches yet. Try a larger mile range.</p>
            ) : null}
          </div>
        </details>

        <details className="location-result-group" open>
          <summary>
            <span>Marketplace</span>
            <strong>Everything nearby by category</strong>
          </summary>
          {previewNearbyListings.length ? (
            <div className="nearby-featured-list">
              {previewNearbyListings.map((business) => (
                <ListingCard key={business.id} business={business} />
              ))}
            </div>
          ) : null}
          <div className="nearby-category-grid">
            {marketplaceCategories.map((category) => {
              const categoryListings =
                category.value === "deals"
                  ? nearbyListings.filter((listing) => listing.deals.some((deal) => deal.is_active))
                  : nearbyListings.filter((listing) => listing.category === category.value);

              return (
                <article key={category.value}>
                  <div>
                    <span>{categoryListings.length} found</span>
                    <h3>{category.label}</h3>
                    <p>
                      {categoryListings.slice(0, 2).map((listing) => listing.name).join(", ") ||
                        "Waiting on local partners"}
                    </p>
                  </div>
                  <Link href={getMarketplaceHref(category.value, travelCity, radiusMiles)}>
                    Open
                  </Link>
                </article>
              );
            })}
          </div>
        </details>

        <details className="location-result-group">
          <summary>
            <span>Best match</span>
            <strong>{rankedAreas[0]?.name ?? "Nearby ride plan"}</strong>
          </summary>
          <div className="ride-finder-results compact">
            {rankedAreas.slice(0, 3).map((area) => (
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
                  <Link href={`/planner?area=${encodeURIComponent(area.locationQuery)}`}>
                    Build Plan
                  </Link>
                  <Link href={`/lodging?area=${encodeURIComponent(area.locationQuery)}`}>
                    Lodging
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
