"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Business, Category, OutdoorStop, RideArea, TrailInfo } from "../lib/types";
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

type NearbyOutdoorStop = OutdoorStop & {
  area: RideArea;
  distanceMiles?: number;
};

type Props = {
  areas: RideArea[];
  initialLocation?: string;
  listings: Business[];
};

type OfflineTripPack = {
  destination: string;
  radiusMiles: number;
  savedAt: string;
  checklist: string[];
  directions: string;
  mapLinks: Array<{
    label: string;
    url: string;
  }>;
  trails: Array<{
    area: string;
    name: string;
    access: string;
    difficulty: TrailInfo["difficulty"];
    activity: TrailInfo["activity"];
    latitude?: number;
    longitude?: number;
    url: string;
  }>;
  stops: Array<{
    category: Category;
    name: string;
    location: string;
    phone: string;
    website_url: string;
    deal?: string;
  }>;
  outdoorStops: Array<{
    area: string;
    name: string;
    kind: OutdoorStop["kind"];
    access: string;
    latitude?: number;
    longitude?: number;
    url: string;
  }>;
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
    label: "Gas / fuel",
    detail: "Gas, diesel, ice, snacks, and trailer-friendly stops.",
    category: "fuel",
  },
  {
    id: "wash",
    label: "Wash bay",
    detail: "Find car washes and spray bays before heading home.",
  },
  {
    id: "family",
    label: "Parks and nature",
    detail: "State parks, campgrounds, waterfalls, overlooks, and photo stops.",
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
  {
    id: "services",
    label: "Local services",
    detail: "Recovery, wash, towing, guide help, and rider support.",
    category: "services",
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

const defaultSelected = ["trails", "sleep", "eat", "fuel", "family"];
const storageKey = "ride-appalachia-trip-planner";
const offlinePackKey = "ride-appalachia-offline-trip-pack";
const planSelectionKey = "ride-appalachia-trip-planner-selections";

type PlanSelections = {
  trails: string[];
  stops: number[];
  outdoors: string[];
};

function readStoredValue(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeStoredValue(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
  }
}

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

function getTrailKey(trail: NearbyTrail) {
  return `${trail.area.slug}-${trail.name}`;
}

function getOutdoorKey(stop: NearbyOutdoorStop) {
  return `${stop.area.slug}-${stop.kind}-${stop.name}`;
}

function getOutdoorCoordinates(stop: OutdoorStop, area: RideArea) {
  return typeof stop.latitude === "number" && typeof stop.longitude === "number"
    ? { latitude: stop.latitude, longitude: stop.longitude }
    : { latitude: area.latitude, longitude: area.longitude };
}

function getOutdoorKindLabel(kind: OutdoorStop["kind"]) {
  const labels: Record<OutdoorStop["kind"], string> = {
    campground: "Campground",
    nature: "Nature",
    photo_spot: "Photo spot",
    state_park: "State park",
    waterfall: "Waterfall",
  };

  return labels[kind];
}

function getMapSearchUrl(destination: string, query: string) {
  const target = destination.trim() || "Appalachia";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query} near ${target}`)}`;
}

function getNeedMapLinks(selectedIds: string[], destination: string) {
  const links = [
    selectedIds.includes("wash")
      ? { label: "Wash bays", url: getMapSearchUrl(destination, "self service car wash wash bay") }
      : undefined,
    selectedIds.includes("family")
      ? { label: "Parks and nature", url: getMapSearchUrl(destination, "state parks campgrounds waterfalls scenic overlooks") }
      : undefined,
    selectedIds.includes("fuel")
      ? { label: "Gas and diesel", url: getMapSearchUrl(destination, "gas diesel fuel") }
      : undefined,
    selectedIds.includes("eat")
      ? { label: "Food nearby", url: getMapSearchUrl(destination, "restaurants food") }
      : undefined,
  ].filter(Boolean);

  return links as Array<{ label: string; url: string }>;
}

export function TripPlanner({ areas, initialLocation = "", listings }: Props) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const [locationFilter, setLocationFilter] = useState(initialLocation);
  const [radiusMiles, setRadiusMiles] = useState(50);
  const [copyStatus, setCopyStatus] = useState("");
  const [directions, setDirections] = useState("");
  const [offlineStatus, setOfflineStatus] = useState("");
  const [planSelections, setPlanSelections] = useState<PlanSelections>({
    trails: [],
    stops: [],
    outdoors: [],
  });

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
  const nearbyOutdoors = useMemo<NearbyOutdoorStop[]>(() => {
    if (!selected.includes("family")) return [];

    const stops = areas.flatMap((area) =>
      area.nearbyOutdoors.map((stop) => {
        const distance = searchCoordinates
          ? distanceMiles(searchCoordinates, getOutdoorCoordinates(stop, area))
          : undefined;

        return { ...stop, area, distanceMiles: distance };
      }),
    );

    const filtered = searchCoordinates
      ? stops.filter((stop) => (stop.distanceMiles ?? 0) <= radiusMiles)
      : locationFilter
        ? stops.filter((stop) =>
            [stop.name, stop.description, stop.area.name, stop.area.state, ...stop.area.nearbyTowns]
              .join(" ")
              .toLowerCase()
              .includes(normalize(locationFilter)),
          )
        : stops;

    return filtered
      .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0))
      .slice(0, 10);
  }, [areas, locationFilter, radiusMiles, searchCoordinates, selected]);
  const plannedTrails = useMemo(
    () => nearbyTrails.filter((trail) => planSelections.trails.includes(getTrailKey(trail))),
    [nearbyTrails, planSelections.trails],
  );
  const plannedStops = useMemo(
    () => nearbyStops.filter((business) => planSelections.stops.includes(business.id)),
    [nearbyStops, planSelections.stops],
  );
  const plannedOutdoors = useMemo(
    () => nearbyOutdoors.filter((stop) => planSelections.outdoors.includes(getOutdoorKey(stop))),
    [nearbyOutdoors, planSelections.outdoors],
  );
  const planTrails = plannedTrails.length ? plannedTrails : nearbyTrails.slice(0, 5);
  const planStops = plannedStops.length ? plannedStops : nearbyStops.slice(0, 8);
  const planOutdoors = plannedOutdoors.length ? plannedOutdoors : nearbyOutdoors.slice(0, 5);
  const mapLinks = useMemo(
    () => getNeedMapLinks(selected, locationFilter),
    [locationFilter, selected],
  );

  const tripSummary = useMemo(() => {
    const trailText = planTrails
      .map((trail) => `- ${trail.name} (${trail.area.name})${trail.distanceMiles !== undefined ? ` - ${Math.round(trail.distanceMiles)} mi` : ""}`)
      .join("\n");
    const stopText = planStops
      .map((business) => {
        const activeDeal = business.deals.find((deal) => deal.is_active);
        const dealText = activeDeal ? `\n  Deal: ${activeDeal.title}` : "";
        return `- ${business.name} (${business.category})\n  ${business.location}\n  ${business.phone}${dealText}`;
      })
      .join("\n\n");
    const mapText = mapLinks.map((link) => `- ${link.label}: ${link.url}`).join("\n");
    const outdoorText = planOutdoors
      .map((stop) => `- ${stop.name} (${getOutdoorKindLabel(stop.kind)}, ${stop.area.name})${stop.distanceMiles !== undefined ? ` - ${Math.round(stop.distanceMiles)} mi` : ""}\n  ${stop.access}\n  ${stop.url}`)
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
      "",
      "Parks, campgrounds, waterfalls, and photo stops:",
      outdoorText || "- No outdoor stops selected yet",
      "",
      "Map searches:",
      mapText || "- No extra map searches selected",
      "",
      "Your directions:",
      directions || "- Add road notes, meetup points, parking, and backup routes.",
    ].join("\n");
  }, [directions, locationFilter, mapLinks, planOutdoors, planStops, planTrails, radiusMiles, selectedItems]);

  useEffect(() => {
    const savedValue = readStoredValue(storageKey);
    try {
      if (savedValue) {
        const savedSelected = JSON.parse(savedValue);
        if (Array.isArray(savedSelected)) {
          const validIds = new Set(plannerItems.map((item) => item.id));
          const nextSelected = savedSelected.filter((item) => validIds.has(item));
          if (nextSelected.length) setSelected(nextSelected);
        }
      }
    } catch {
      removeStoredValue(storageKey);
    }

    const savedPack = readStoredValue(offlinePackKey);
    try {
      if (savedPack) {
        const pack = JSON.parse(savedPack) as Partial<OfflineTripPack>;
        if (typeof pack.directions === "string") setDirections(pack.directions);
      }
    } catch {
      removeStoredValue(offlinePackKey);
    }

    const savedSelections = readStoredValue(planSelectionKey);
    try {
      if (savedSelections) {
        const nextSelections = JSON.parse(savedSelections) as Partial<PlanSelections>;
        setPlanSelections({
          trails: Array.isArray(nextSelections.trails) ? nextSelections.trails : [],
          stops: Array.isArray(nextSelections.stops) ? nextSelections.stops : [],
          outdoors: Array.isArray(nextSelections.outdoors) ? nextSelections.outdoors : [],
        });
      }
    } catch {
      removeStoredValue(planSelectionKey);
    }
  }, []);

  useEffect(() => {
    writeStoredValue(storageKey, JSON.stringify(selected));
  }, [selected]);

  useEffect(() => {
    writeStoredValue(planSelectionKey, JSON.stringify(planSelections));
  }, [planSelections]);

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
    setPlanSelections({ trails: [], stops: [], outdoors: [] });
    writeStoredValue(storageKey, JSON.stringify(defaultSelected));
    writeStoredValue(planSelectionKey, JSON.stringify({ trails: [], stops: [], outdoors: [] }));
  }

  function toggleTrailPlan(trail: NearbyTrail) {
    const key = getTrailKey(trail);
    setPlanSelections((current) => ({
      ...current,
      trails: current.trails.includes(key)
        ? current.trails.filter((item) => item !== key)
        : [...current.trails, key],
    }));
  }

  function toggleStopPlan(id: number) {
    setPlanSelections((current) => ({
      ...current,
      stops: current.stops.includes(id)
        ? current.stops.filter((item) => item !== id)
        : [...current.stops, id],
    }));
  }

  function toggleOutdoorPlan(stop: NearbyOutdoorStop) {
    const key = getOutdoorKey(stop);
    setPlanSelections((current) => ({
      ...current,
      outdoors: current.outdoors.includes(key)
        ? current.outdoors.filter((item) => item !== key)
        : [...current.outdoors, key],
    }));
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

  function buildOfflinePack(): OfflineTripPack {
    return {
      destination: locationFilter || "Any area",
      radiusMiles,
      savedAt: new Date().toISOString(),
      checklist: selectedItems.map((item) => item.label),
      directions,
      mapLinks,
      trails: (plannedTrails.length ? plannedTrails : nearbyTrails.slice(0, 12)).map((trail) => ({
        area: trail.area.name,
        name: trail.name,
        access: trail.access,
        difficulty: trail.difficulty,
        activity: trail.activity,
        latitude: trail.latitude ?? trail.area.latitude,
        longitude: trail.longitude ?? trail.area.longitude,
        url: trail.url,
      })),
      stops: (plannedStops.length ? plannedStops : nearbyStops.slice(0, 12)).map((business) => {
        const activeDeal = business.deals.find((deal) => deal.is_active);

        return {
          category: business.category,
          name: business.name,
          location: business.location,
          phone: business.phone,
          website_url: business.website_url,
          deal: activeDeal?.title,
        };
      }),
      outdoorStops: (plannedOutdoors.length ? plannedOutdoors : nearbyOutdoors.slice(0, 12)).map((stop) => ({
        area: stop.area.name,
        name: stop.name,
        kind: stop.kind,
        access: stop.access,
        latitude: stop.latitude ?? stop.area.latitude,
        longitude: stop.longitude ?? stop.area.longitude,
        url: stop.url,
      })),
    };
  }

  function saveOfflinePack() {
    const pack = buildOfflinePack();
    if (writeStoredValue(offlinePackKey, JSON.stringify(pack))) {
      setOfflineStatus("Offline pack saved on this device.");
    } else {
      setOfflineStatus("Offline save was blocked. Download the pack instead.");
    }
  }

  function downloadOfflinePack() {
    const pack = buildOfflinePack();
    const blob = new Blob([JSON.stringify(pack, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `appalachia-offroad-${normalize(pack.destination).replace(/[^a-z0-9]+/g, "-") || "trip"}-offline-pack.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setOfflineStatus("Offline pack downloaded.");
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
            <p>Step 2</p>
            <h2>Pick what you need.</h2>
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
            <p>Your plan</p>
            <h2>{plannedTrails.length + plannedStops.length ? "Saved picks." : "Start adding picks."}</h2>
          </div>
          <div className="planner-pick-summary">
            <span>{plannedTrails.length || "Auto"} trail picks</span>
            <span>{plannedStops.length || "Auto"} local stops</span>
            <span>{plannedOutdoors.length || "Auto"} outdoor stops</span>
            <span>{mapLinks.length} map searches</span>
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
              Save, download, or print before you haul out.
            </li>
          </ol>
          <div className="planner-tools">
            <button type="button" onClick={copyTripPlan}>
              Copy Plan
            </button>
            <button type="button" onClick={saveOfflinePack}>
              Save Offline
            </button>
            <Link href="/offline">Offline Mode</Link>
            <button type="button" onClick={() => window.print()}>
              Print
            </button>
            <button type="button" onClick={downloadOfflinePack}>
              Download Pack
            </button>
            <button type="button" onClick={startOver}>
              Reset
            </button>
            {copyStatus ? <p>{copyStatus}</p> : null}
            {offlineStatus ? <p>{offlineStatus}</p> : null}
          </div>
        </aside>
      </div>

      <section className="planner-card">
        <div className="section-heading">
          <p>Step 3</p>
          <h2>Choose trails near {locationFilter || "your trip"}.</h2>
        </div>
        <div className="planner-trail-grid">
          {nearbyTrails.map((trail) => {
            const trailKey = getTrailKey(trail);
            const isPlanned = planSelections.trails.includes(trailKey);

            return (
            <article className={isPlanned ? "is-planned" : ""} key={trailKey}>
              <span>{trail.area.name} • {trail.activity ?? "OHV"}</span>
              <h3>{trail.name}</h3>
              <p>
                {trail.access}
                {trail.distanceMiles !== undefined ? ` • ${Math.round(trail.distanceMiles)} miles` : ""}
              </p>
              <div className="trail-actions">
                <button type="button" onClick={() => toggleTrailPlan(trail)}>
                  {isPlanned ? "Added" : "Add trail"}
                </button>
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
            );
          })}
          {!nearbyTrails.length ? (
            <p className="empty-state">No trail matches yet. Try a nearby town or larger range.</p>
          ) : null}
        </div>
      </section>

      <section className="planner-card">
        <div className="section-heading">
          <p>Step 4</p>
          <h2>Pick lodging, food, fuel, and backup stops.</h2>
        </div>
        {nearbyStops.length ? (
          <div className="planner-match-grid">
            {nearbyStops.map((business) => {
              const activeDeal = business.deals.find((deal) => deal.is_active);
              const isPlanned = planSelections.stops.includes(business.id);

              return (
                <article className={isPlanned ? "planner-match is-planned" : "planner-match"} key={business.id}>
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
                    <button type="button" onClick={() => toggleStopPlan(business.id)}>
                      {isPlanned ? "Added" : "Add"}
                    </button>
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

      {mapLinks.length ? (
        <section className="planner-card">
          <div className="section-heading">
            <p>Step 5</p>
            <h2>Add parks, campgrounds, waterfalls, and photo stops.</h2>
          </div>
          {nearbyOutdoors.length ? (
            <div className="planner-outdoor-grid">
              {nearbyOutdoors.map((stop) => {
                const outdoorKey = getOutdoorKey(stop);
                const isPlanned = planSelections.outdoors.includes(outdoorKey);

                return (
                  <article className={isPlanned ? "is-planned" : ""} key={outdoorKey}>
                    {stop.photoUrl ? (
                      <img
                        alt={stop.name}
                        className="planner-outdoor-photo"
                        src={stop.photoUrl}
                      />
                    ) : null}
                    <span>{stop.area.name} • {getOutdoorKindLabel(stop.kind)}</span>
                    <h3>{stop.name}</h3>
                    <p>
                      {stop.description}
                      {stop.distanceMiles !== undefined ? ` • ${Math.round(stop.distanceMiles)} miles` : ""}
                    </p>
                    <small>{stop.access}</small>
                    <div className="trail-actions">
                      <button type="button" onClick={() => toggleOutdoorPlan(stop)}>
                        {isPlanned ? "Added" : "Add stop"}
                      </button>
                      <a href={stop.url} rel="noreferrer" target="_blank">
                        Open Map
                      </a>
                      {stop.photoCredit && stop.photoSourceUrl ? (
                        <a href={stop.photoSourceUrl} rel="noreferrer" target="_blank">
                          Photo
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="empty-state">Pick Parks and nature or try a wider range.</p>
          )}
        </section>
      ) : null}

      {mapLinks.length ? (
        <section className="planner-card">
          <div className="section-heading">
            <p>Step 6</p>
            <h2>Open quick map searches.</h2>
          </div>
          <div className="planner-map-link-grid">
            {mapLinks.map((link) => (
              <a href={link.url} key={link.label} rel="noreferrer" target="_blank">
                {link.label}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="planner-card planner-summary">
        <div className="section-heading">
          <p>Final step</p>
          <h2>Downloadable weekend plan.</h2>
        </div>
        <label className="planner-directions">
          Build your own directions
          <textarea
            placeholder="Example: Meet at cabin at 8:00. Fuel in Matewan. Park trailers at the main lot. Take the easier loop first, lunch at..."
            value={directions}
            onChange={(event) => setDirections(event.target.value)}
          />
        </label>
        <pre>{tripSummary}</pre>
      </section>
    </section>
  );
}
