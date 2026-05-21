"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Business, Category, RideArea, TrailInfo } from "../lib/types";
import { TrackedAction } from "./TrackedAction";

type PlannerItem = {
  id: string;
  label: string;
  detail: string;
  category?: Exclude<Category, "deals">;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type NearbyTrail = TrailInfo & {
  area: RideArea;
  distanceMiles?: number;
};

type NearbyBusiness = Business & {
  distanceMiles?: number;
};

type Props = {
  areas: RideArea[];
  initialLocation?: string;
  listings: Business[];
};

const plannerItems: PlannerItem[] = [
  {
    id: "trails",
    label: "Trail passes and rules",
    detail: "Permit links, trail maps, and access notes.",
  },
  {
    id: "sleep",
    label: "Place to stay",
    detail: "Cabin, campground, hotel, or rider-friendly rental.",
    category: "lodging",
  },
  {
    id: "eat",
    label: "Food stops",
    detail: "Breakfast, dinner, group meals, and local rider deals.",
    category: "food",
  },
  {
    id: "fuel",
    label: "Fuel and supplies",
    detail: "Gas, ice, straps, gloves, snacks, and trailhead basics.",
    category: "fuel",
  },
  {
    id: "rent",
    label: "Machine rental",
    detail: "ATV, UTV, helmets, pickup windows, and trail advice.",
    category: "rentals",
  },
  {
    id: "repair",
    label: "Repair backup",
    detail: "Tires, belts, fluids, parts, and quick-turn service.",
    category: "repairs",
  },
];

const knownTravelCities: Array<Coordinates & { names: string[] }> = [
  { names: ["rush", "rush ky"], latitude: 38.33536, longitude: -82.78155 },
  { names: ["ashland", "ashland ky"], latitude: 38.4784, longitude: -82.6379 },
  { names: ["grayson", "grayson ky"], latitude: 38.3326, longitude: -82.9485 },
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

const defaultSelected = ["trails", "sleep", "eat", "fuel"];
const storageKey = "ride-appalachia-trip-planner";

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

function getBusinessCoordinates(business: Business, areas: RideArea[]) {
  const directCity = findCityInText(business.location);
  if (directCity) return directCity;

  const area = areas.find((item) => {
    const searchable = [item.name, item.locationQuery, ...item.nearbyTowns]
      .join(" ")
      .toLowerCase();
    return searchable.includes(business.location.toLowerCase());
  });

  return area ? { latitude: area.latitude, longitude: area.longitude } : undefined;
}

function getTrailCoordinates(trail: TrailInfo, area: RideArea) {
  return typeof trail.latitude === "number" && typeof trail.longitude === "number"
    ? { latitude: trail.latitude, longitude: trail.longitude }
    : { latitude: area.latitude, longitude: area.longitude };
}

function isPlannerCategory(category: Category): category is Exclude<Category, "deals"> {
  return category !== "deals";
}

export function TripPlanner({ areas, initialLocation = "", listings }: Props) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const [locationFilter, setLocationFilter] = useState(initialLocation);
  const [radiusMiles, setRadiusMiles] = useState(50);
  const [copyStatus, setCopyStatus] = useState("");

  const searchCoordinates = findKnownCity(locationFilter);
  const selectedItems = useMemo(
    () => plannerItems.filter((item) => selected.includes(item.id)),
    [selected],
  );
  const selectedCategories = useMemo(
    () => new Set(selectedItems.map((item) => item.category).filter(Boolean)),
    [selectedItems],
  );

  const nearbyTrails = useMemo<NearbyTrail[]>(() => {
    const trails = areas.flatMap((area) =>
      area.trails.map((trail) => {
        const distance = searchCoordinates
          ? distanceMiles(searchCoordinates, getTrailCoordinates(trail, area))
          : undefined;

        return { ...trail, area, distanceMiles: distance };
      }),
    );

    const filtered = searchCoordinates
      ? trails.filter((trail) => (trail.distanceMiles ?? 0) <= radiusMiles)
      : locationFilter
        ? trails.filter((trail) =>
            [trail.name, trail.area.name, trail.area.state, ...trail.area.nearbyTowns]
              .join(" ")
              .toLowerCase()
              .includes(normalize(locationFilter)),
          )
        : trails;

    return filtered
      .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0))
      .slice(0, 8);
  }, [areas, locationFilter, radiusMiles, searchCoordinates]);

  const nearbyStops = useMemo<NearbyBusiness[]>(() => {
    const ranked = listings.map((business) => {
      const businessCoordinates = getBusinessCoordinates(business, areas);
      const distance =
        searchCoordinates && businessCoordinates
          ? distanceMiles(searchCoordinates, businessCoordinates)
          : undefined;

      return { ...business, distanceMiles: distance };
    });

    const filtered = searchCoordinates
      ? ranked.filter((business) => business.distanceMiles === undefined || business.distanceMiles <= radiusMiles)
      : locationFilter
        ? ranked.filter((business) =>
            [business.location, business.name, business.description]
              .join(" ")
              .toLowerCase()
              .includes(normalize(locationFilter)),
          )
        : ranked;

    return filtered
      .filter(
        (business) =>
          isPlannerCategory(business.category) &&
          selectedCategories.has(business.category),
      )
      .sort((a, b) => (a.distanceMiles ?? 9999) - (b.distanceMiles ?? 9999))
      .slice(0, 9);
  }, [areas, listings, locationFilter, radiusMiles, searchCoordinates, selectedCategories]);

  const tripSummary = useMemo(() => {
    const trailText = nearbyTrails
      .slice(0, 5)
      .map((trail) => `- ${trail.name} (${trail.area.name})${trail.distanceMiles !== undefined ? ` - ${Math.round(trail.distanceMiles)} mi` : ""}`)
      .join("\n");
    const stopText = nearbyStops
      .map((business) => {
        const activeDeal = business.deals.find((deal) => deal.is_active);
        const dealText = activeDeal ? `\n  Deal: ${activeDeal.title}` : "";
        return `- ${business.name} (${business.category})\n  ${business.location}\n  ${business.phone}${dealText}`;
      })
      .join("\n\n");

    return [
      "Appalachia Offroad Trip Plan",
      "",
      `Destination: ${locationFilter || "Any area"}`,
      `Radius: ${radiusMiles} miles`,
      "",
      "Checklist:",
      ...selectedItems.map((item) => `- ${item.label}`),
      "",
      "Trail options:",
      trailText || "- No trail matches yet",
      "",
      "Local stops:",
      stopText || "- No local stops match yet",
    ].join("\n");
  }, [locationFilter, nearbyStops, nearbyTrails, radiusMiles, selectedItems]);

  useEffect(() => {
    const savedValue = window.localStorage.getItem(storageKey);
    if (!savedValue) return;

    try {
      const savedSelected = JSON.parse(savedValue);
      if (Array.isArray(savedSelected)) {
        const validIds = new Set(plannerItems.map((item) => item.id));
        const nextSelected = savedSelected.filter((item) => validIds.has(item));
        if (nextSelected.length) setSelected(nextSelected);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(selected));
  }, [selected]);

  function toggleItem(id: string) {
    setCopyStatus("");
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function startOver() {
    setSelected(defaultSelected);
    setLocationFilter(initialLocation);
    setRadiusMiles(50);
    setCopyStatus("");
    window.localStorage.setItem(storageKey, JSON.stringify(defaultSelected));
  }

  async function copyTripPlan() {
    setCopyStatus("");

    try {
      await window.navigator.clipboard.writeText(tripSummary);
      setCopyStatus("Trip plan copied.");
    } catch {
      setCopyStatus("Copy was blocked. Use print instead.");
    }
  }

  return (
    <section className="planner-redesign">
      <div className="planner-setup">
        <div>
          <p className="eyebrow">Start here</p>
          <h2>Where are you riding?</h2>
          <p>Enter the town, pick a mile range, and check what you need.</p>
        </div>
        <label>
          Destination
          <input
            placeholder="Rush KY, Harlan KY, Matewan WV..."
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
          />
        </label>
        <label>
          Search range
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
      </div>

      <div className="planner-main-grid">
        <section className="planner-card">
          <div className="section-heading">
            <p>Checklist</p>
            <h2>Pick what matters.</h2>
          </div>
          <div className="planner-options clean">
            {plannerItems.map((item) => (
              <label
                className={
                  selected.includes(item.id)
                    ? "planner-option is-selected"
                    : "planner-option"
                }
                key={item.id}
              >
                <input
                  checked={selected.includes(item.id)}
                  type="checkbox"
                  onChange={() => toggleItem(item.id)}
                />
                <span>{item.label}</span>
                <small>{item.detail}</small>
              </label>
            ))}
          </div>
        </section>

        <aside className="planner-card planner-roadmap-card">
          <div className="section-heading">
            <p>Road map</p>
            <h2>Trip at a glance.</h2>
          </div>
          <ol className="roadmap-list">
            <li>
              <span>1</span>
              Choose destination and miles.
            </li>
            <li>
              <span>2</span>
              Verify trail passes and rules.
            </li>
            <li>
              <span>3</span>
              Lock lodging, food, fuel, and backup stops.
            </li>
            <li>
              <span>4</span>
              Copy or print the plan before you haul out.
            </li>
          </ol>
          <div className="planner-tools">
            <button type="button" onClick={copyTripPlan}>
              Copy Plan
            </button>
            <button type="button" onClick={() => window.print()}>
              Print
            </button>
            <button type="button" onClick={startOver}>
              Reset
            </button>
            {copyStatus ? <p>{copyStatus}</p> : null}
          </div>
        </aside>
      </div>

      <section className="planner-card">
        <div className="section-heading">
          <p>Trails</p>
          <h2>Trail options near {locationFilter || "your trip"}.</h2>
        </div>
        <div className="planner-trail-grid">
          {nearbyTrails.map((trail) => (
            <article key={`${trail.area.slug}-${trail.name}`}>
              <span>{trail.area.name}</span>
              <h3>{trail.name}</h3>
              <p>
                {trail.access}
                {trail.distanceMiles !== undefined ? ` • ${Math.round(trail.distanceMiles)} miles` : ""}
              </p>
              <div className="trail-actions">
                <a href={trail.url} rel="noreferrer" target="_blank">
                  {trail.activity === "Hiking" ? "Hiking Info" : "Trail Map"}
                </a>
                {trail.passUrl ? (
                  <a href={trail.passUrl} rel="noreferrer" target="_blank">
                    Passes / Rules
                  </a>
                ) : null}
              </div>
            </article>
          ))}
          {!nearbyTrails.length ? (
            <p className="empty-state">No trail matches yet. Try a nearby town or larger range.</p>
          ) : null}
        </div>
      </section>

      <section className="planner-card">
        <div className="section-heading">
          <p>Local stops</p>
          <h2>Useful stops for this plan.</h2>
        </div>
        {nearbyStops.length ? (
          <div className="planner-match-grid">
            {nearbyStops.map((business) => {
              const activeDeal = business.deals.find((deal) => deal.is_active);

              return (
                <article className="planner-match" key={business.id}>
                  <div>
                    <span>{business.category}</span>
                    <h3>{business.name}</h3>
                    <p>
                      {business.location}
                      {business.distanceMiles !== undefined ? ` • ${Math.round(business.distanceMiles)} miles` : ""}
                    </p>
                    {activeDeal ? <strong>{activeDeal.title}</strong> : null}
                  </div>
                  <div>
                    <TrackedAction
                      businessId={business.id}
                      href={`/business/${business.slug}`}
                      kind="link"
                    >
                      View
                    </TrackedAction>
                    <TrackedAction businessId={business.id} href={`tel:${business.phone}`}>
                      Call
                    </TrackedAction>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">Check more items or try a different destination.</p>
        )}
      </section>

      <section className="planner-card planner-summary">
        <div className="section-heading">
          <p>Shareable summary</p>
          <h2>Weekend plan.</h2>
        </div>
        <pre>{tripSummary}</pre>
      </section>
    </section>
  );
}
