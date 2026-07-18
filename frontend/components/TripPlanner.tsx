"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { shareTripPlan } from "../lib/api";
import type { Business, Category, OutdoorStop, RideArea, TrailInfo } from "../lib/types";
import { TrackedAction } from "./TrackedAction";
import { exploreTripStorageKey, type ExploreTripStop } from "./AddExploreToTrip";

type PlannerItem = {
  id: string;
  label: string;
  detail: string;
  category?: Exclude<Category, "deals">;
};

type PlannerPreset = {
  id: string;
  label: string;
  detail: string;
  selected: string[];
  radiusMiles: number;
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
  exploreStops: ExploreTripStop[];
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
  { names: ["royal blue", "royal blue tn"], latitude: 36.4331, longitude: -84.3094 },
  { names: ["pioneer", "pioneer tn"], latitude: 36.4331, longitude: -84.3094 },
  { names: ["huntsville", "huntsville tn"], latitude: 36.4098, longitude: -84.4908 },
  { names: ["oneida", "oneida tn"], latitude: 36.4981, longitude: -84.5127 },
  { names: ["lafollette", "lafollette tn"], latitude: 36.3829, longitude: -84.1199 },
];

const defaultSelected = ["trails", "sleep", "eat", "fuel", "family"];
const storageKey = "ride-appalachia-trip-planner";
const offlinePackKey = "ride-appalachia-offline-trip-pack";
const planSelectionKey = "ride-appalachia-trip-planner-selections";

const destinationChips = ["Rush KY", "Harlan KY", "Matewan WV", "Royal Blue TN", "Pikeville KY"];

const plannerPresets: PlannerPreset[] = [
  {
    id: "day",
    label: "Day Ride",
    detail: "Trails, fuel, food, and a wash bay.",
    selected: ["trails", "eat", "fuel", "wash"],
    radiusMiles: 50,
  },
  {
    id: "weekend",
    label: "Weekend Trip",
    detail: "Lodging, meals, fuel, trail rules, and nature stops.",
    selected: ["trails", "sleep", "eat", "fuel", "family"],
    radiusMiles: 75,
  },
  {
    id: "family",
    label: "Family Trip",
    detail: "Easy planning with parks, food, lodging, and backup stops.",
    selected: ["trails", "sleep", "eat", "fuel", "family", "services"],
    radiusMiles: 75,
  },
  {
    id: "backup",
    label: "Breakdown Ready",
    detail: "Repair, fuel, service, wash, and local support.",
    selected: ["trails", "fuel", "wash", "repair", "services"],
    radiusMiles: 100,
  },
  {
    id: "first-time",
    label: "First Time Here",
    detail: "Rules, lodging, food, rentals, fuel, and backup help.",
    selected: ["trails", "sleep", "eat", "fuel", "rent", "repair", "services"],
    radiusMiles: 75,
  },
];

type PlannerSection = "trails" | "stops" | "outdoors" | "maps" | "summary";

const defaultOpenSections: Record<PlannerSection, boolean> = {
  trails: true,
  stops: true,
  outdoors: true,
  maps: false,
  summary: true,
};

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
  if (typeof business.latitude === "number" && typeof business.longitude === "number") {
    return { latitude: business.latitude, longitude: business.longitude };
  }
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

function exploreStopType(category: string) {
  if (["lodging", "campgrounds"].includes(category)) return "Lodging";
  if (["local_food", "ice_cream_desserts"].includes(category)) return "Food";
  if (category === "fuel") return "Fuel";
  if (["local_shops", "country_stores"].includes(category)) return "Shopping";
  if (["hospitals_urgent_care", "repairs_recovery"].includes(category)) return "Emergency service";
  if (["fishing", "hiking", "swimming", "family_activities", "parks", "events"].includes(category)) return "Activity";
  return "Attraction";
}

function exploreStopCoordinates(stop: ExploreTripStop): Coordinates | undefined {
  return typeof stop.latitude === "number" && typeof stop.longitude === "number" ? { latitude: stop.latitude, longitude: stop.longitude } : undefined;
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
  const [shareEmail, setShareEmail] = useState("");
  const [sharePhone, setSharePhone] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [shareStatusType, setShareStatusType] = useState<"success" | "error">("success");
  const [isSharingPlan, setIsSharingPlan] = useState(false);
  const [openSections, setOpenSections] = useState(defaultOpenSections);
  const [planSelections, setPlanSelections] = useState<PlanSelections>({
    trails: [],
    stops: [],
    outdoors: [],
  });
  const [exploreStops, setExploreStops] = useState<ExploreTripStop[]>([]);

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
      ? ranked.filter((business) => business.distanceMiles !== undefined && business.distanceMiles <= radiusMiles)
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
  const visibleTrails = useMemo(
    () =>
      [...nearbyTrails].sort((a, b) => {
        const aPlanned = planSelections.trails.includes(getTrailKey(a));
        const bPlanned = planSelections.trails.includes(getTrailKey(b));
        if (aPlanned !== bPlanned) return aPlanned ? -1 : 1;
        return (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0);
      }),
    [nearbyTrails, planSelections.trails],
  );
  const visibleStops = useMemo(
    () =>
      [...nearbyStops].sort((a, b) => {
        const aPlanned = planSelections.stops.includes(a.id);
        const bPlanned = planSelections.stops.includes(b.id);
        if (aPlanned !== bPlanned) return aPlanned ? -1 : 1;
        return (a.distanceMiles ?? 9999) - (b.distanceMiles ?? 9999);
      }),
    [nearbyStops, planSelections.stops],
  );
  const visibleOutdoors = useMemo(
    () =>
      [...nearbyOutdoors].sort((a, b) => {
        const aPlanned = planSelections.outdoors.includes(getOutdoorKey(a));
        const bPlanned = planSelections.outdoors.includes(getOutdoorKey(b));
        if (aPlanned !== bPlanned) return aPlanned ? -1 : 1;
        return (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0);
      }),
    [nearbyOutdoors, planSelections.outdoors],
  );
  const mapLinks = useMemo(
    () => getNeedMapLinks(selected, locationFilter),
    [locationFilter, selected],
  );
  const manualPickCount = plannedTrails.length + plannedStops.length + plannedOutdoors.length;
  const activePreset = plannerPresets.find(
    (preset) =>
      preset.radiusMiles === radiusMiles &&
      preset.selected.length === selected.length &&
      preset.selected.every((id) => selected.includes(id)),
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
    const exploreText = exploreStops.map((stop, index) => {
      const previous = index ? exploreStopCoordinates(exploreStops[index - 1]) : undefined;
      const current = exploreStopCoordinates(stop);
      const leg = previous && current ? distanceMiles(previous, current) : undefined;
      return `${index + 1}. ${stop.name} (${exploreStopType(stop.category)})${leg !== undefined ? ` - ${leg.toFixed(1)} mi from prior stop` : ""}\n  ${[stop.address, stop.city, stop.state].filter(Boolean).join(", ")}${stop.arrivalNotes ? `\n  Arrival notes: ${stop.arrivalNotes}` : ""}`;
    }).join("\n\n");

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
      "Explore itinerary stops:",
      exploreText || "- No Explore destinations added yet",
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
  }, [directions, exploreStops, locationFilter, mapLinks, planOutdoors, planStops, planTrails, radiusMiles, selectedItems]);

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

    const savedExploreStops = readStoredValue(exploreTripStorageKey);
    try {
      if (savedExploreStops) {
        const parsed = JSON.parse(savedExploreStops);
        if (Array.isArray(parsed)) setExploreStops(parsed);
      }
    } catch {
      removeStoredValue(exploreTripStorageKey);
    }
  }, []);

  useEffect(() => {
    writeStoredValue(storageKey, JSON.stringify(selected));
  }, [selected]);

  useEffect(() => {
    writeStoredValue(planSelectionKey, JSON.stringify(planSelections));
  }, [planSelections]);

  useEffect(() => {
    writeStoredValue(exploreTripStorageKey, JSON.stringify(exploreStops));
  }, [exploreStops]);

  function toggleItem(id: string) {
    setCopyStatus("");
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function applyPreset(preset: PlannerPreset) {
    setCopyStatus("");
    setSelected(preset.selected);
    setRadiusMiles(preset.radiusMiles);
  }

  function togglePlannerSection(section: PlannerSection) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function startOver() {
    setSelected(defaultSelected);
    setLocationFilter(initialLocation);
    setRadiusMiles(50);
    setCopyStatus("");
    setOfflineStatus("");
    setOpenSections(defaultOpenSections);
    setPlanSelections({ trails: [], stops: [], outdoors: [] });
    setExploreStops([]);
    writeStoredValue(storageKey, JSON.stringify(defaultSelected));
    writeStoredValue(planSelectionKey, JSON.stringify({ trails: [], stops: [], outdoors: [] }));
    writeStoredValue(exploreTripStorageKey, "[]");
  }

  function moveExploreStop(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= exploreStops.length) return;
    setExploreStops((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function updateExploreNotes(id: number, arrivalNotes: string) {
    setExploreStops((current) => current.map((stop) => stop.id === id ? { ...stop, arrivalNotes } : stop));
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

  async function sendTripPlan() {
    setShareStatus("");
    setShareStatusType("success");
    if (!shareEmail.trim() && !sharePhone.trim()) {
      setShareStatusType("error");
      setShareStatus("Enter an email or phone number first.");
      return;
    }

    setIsSharingPlan(true);
    try {
      const result = await shareTripPlan({
        destination: locationFilter || "Any area",
        plan: tripSummary,
        email: shareEmail,
        phone: sharePhone,
      });
      const messages = [
        shareEmail.trim() ? result.email_message : "",
        sharePhone.trim() ? result.sms_message : "",
      ].filter(Boolean);
      const sent = result.email_sent || result.sms_sent;
      setShareStatusType(sent ? "success" : "error");
      setShareStatus(messages.join(" ") || (sent ? "Trip plan sent." : "Unable to send trip plan."));
    } catch (caughtError) {
      setShareStatusType("error");
      setShareStatus(caughtError instanceof Error ? caughtError.message : "Unable to send trip plan.");
    } finally {
      setIsSharingPlan(false);
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
      exploreStops,
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
          <p>Pick a destination, choose a trip style, then add trails and stops into one saved ride plan.</p>
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
        <div className="planner-chip-panel">
          <span>Popular destinations</span>
          <div className="planner-chip-row">
            {destinationChips.map((destination) => (
              <button
                className={normalize(locationFilter) === normalize(destination) ? "is-active" : ""}
                key={destination}
                type="button"
                onClick={() => setLocationFilter(destination)}
              >
                {destination}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="planner-main-grid">
        <section className="planner-card">
          <div className="section-heading">
            <p>Step 2</p>
            <h2>Pick a trip style.</h2>
          </div>
          <div className="planner-preset-grid">
            {plannerPresets.map((preset) => (
              <button
                className={activePreset?.id === preset.id ? "planner-preset is-active" : "planner-preset"}
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
              >
                <strong>{preset.label}</strong>
                <span>{preset.detail}</span>
              </button>
            ))}
          </div>
          <div className="section-heading compact">
            <p>Fine tune</p>
            <h2>Adjust your checklist.</h2>
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
            <h2>{manualPickCount ? "Saved picks." : "Smart starter plan."}</h2>
          </div>
          <div className="planner-pick-summary">
            <span>{plannedTrails.length || planTrails.length} trail picks</span>
            <span>{plannedStops.length || planStops.length} local stops</span>
            <span>{plannedOutdoors.length || planOutdoors.length} outdoor stops</span>
            <span>{mapLinks.length} map searches</span>
          </div>
          <div className="planner-live-preview">
            <div>
              <strong>{locationFilter || "Any area"}</strong>
              <span>{radiusMiles} mile search range</span>
            </div>
            <div>
              <strong>{activePreset?.label ?? "Custom trip"}</strong>
              <span>{selectedItems.length} checklist items</span>
            </div>
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

      <section className="planner-card explore-trip-planner" id="explore-trip-stops">
        <div className="planner-section-heading">
          <div className="section-heading"><p>Your itinerary</p><h2>Explore Appalachia trip stops</h2></div>
          <Link href="/explore">Add more destinations</Link>
        </div>
        {exploreStops.length ? <ol className="explore-ordered-stops">{exploreStops.map((stop, index) => {
          const previous = index ? exploreStopCoordinates(exploreStops[index - 1]) : undefined;
          const current = exploreStopCoordinates(stop);
          const legMiles = previous && current ? distanceMiles(previous, current) : undefined;
          const minutes = legMiles !== undefined ? Math.max(1, Math.round(legMiles / 35 * 60)) : undefined;
          const address = [stop.address, stop.city, stop.state].filter(Boolean).join(", ");
          const hours = Object.entries(stop.hours_json || {}).map(([day, value]) => `${day}: ${value}`).join(" · ");
          const directionsTarget = current ? `${current.latitude},${current.longitude}` : address;
          return <li key={stop.id}>
            <span className="explore-stop-number">{index + 1}</span>
            <div className="explore-stop-body"><div><span>{exploreStopType(stop.category)}</span><h3>{stop.name}</h3><p>{address || "Address being verified"}</p>{legMiles !== undefined ? <strong>From previous stop: {legMiles.toFixed(1)} miles · about {minutes} minutes</strong> : null}{hours ? <small>Hours: {hours}</small> : null}</div>
            <label>Arrival notes<textarea maxLength={500} placeholder="Meetup point, parking, check-in, or timing notes" value={stop.arrivalNotes || ""} onChange={(event) => updateExploreNotes(stop.id, event.target.value)}/></label>
            <div className="trail-actions"><button disabled={index === 0} onClick={() => moveExploreStop(index, -1)} type="button">Move up</button><button disabled={index === exploreStops.length - 1} onClick={() => moveExploreStop(index, 1)} type="button">Move down</button><button onClick={() => setExploreStops((currentStops) => currentStops.filter((item) => item.id !== stop.id))} type="button">Remove</button><Link href={`/explore/${stop.slug}`}>Details</Link>{directionsTarget ? <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(directionsTarget)}`} rel="noreferrer" target="_blank">Directions</a> : null}</div></div>
          </li>;
        })}</ol> : <div className="empty-state"><strong>No Explore destinations added yet.</strong><p>Browse approved food, lodging, attractions, activities, shops, and essential services, then choose Add to Trip.</p><Link href="/explore">Explore Appalachia</Link></div>}
        {exploreStops.length > 1 ? <p className="field-help">Driving time is an estimate based on straight-line mileage and a 35 mph local-road average. Use Directions for the actual route.</p> : null}
      </section>

      <section className="planner-card">
        <div className="planner-section-heading">
          <div className="section-heading">
            <p>Step 3</p>
            <h2>Choose trails near {locationFilter || "your trip"}.</h2>
          </div>
          <button type="button" onClick={() => togglePlannerSection("trails")}>
            {openSections.trails ? "Hide" : `Show ${nearbyTrails.length}`}
          </button>
        </div>
        {openSections.trails ? (
          <div className="planner-trail-grid">
            {visibleTrails.map((trail) => {
              const trailKey = getTrailKey(trail);
              const isPlanned = planSelections.trails.includes(trailKey);

              return (
                <article className={isPlanned ? "is-planned" : ""} key={trailKey}>
                  <span>{isPlanned ? "In plan" : trail.area.name} | {trail.activity ?? "OHV"}</span>
                  <h3>{trail.name}</h3>
                  <p>
                    {trail.access}
                    {trail.distanceMiles !== undefined ? ` | ${Math.round(trail.distanceMiles)} miles` : ""}
                  </p>
                  <div className="trail-actions">
                    <button type="button" onClick={() => toggleTrailPlan(trail)}>
                      {isPlanned ? "In plan" : "Add to plan"}
                    </button>
                    <a href={trail.url} rel="noreferrer" target="_blank">
                      {trail.activity === "Hiking" ? "Hiking info" : "Trail map"}
                    </a>
                    {trail.passUrl ? (
                      <a href={trail.passUrl} rel="noreferrer" target="_blank">
                        Passes / rules
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
            {!nearbyTrails.length ? (
              <div className="empty-state planner-empty-action">
                <strong>No trail matches within {radiusMiles} miles.</strong>
                <span>Try a popular destination chip or widen the range.</span>
                <button type="button" onClick={() => setRadiusMiles(100)}>
                  Try 100 miles
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="planner-card">
        <div className="planner-section-heading">
          <div className="section-heading">
            <p>Step 4</p>
            <h2>Pick lodging, food, fuel, and backup stops.</h2>
          </div>
          <button type="button" onClick={() => togglePlannerSection("stops")}>
            {openSections.stops ? "Hide" : `Show ${nearbyStops.length}`}
          </button>
        </div>
        {openSections.stops ? (
          nearbyStops.length ? (
            <div className="planner-match-grid">
              {visibleStops.map((business) => {
                const activeDeal = business.deals.find((deal) => deal.is_active);
                const isPlanned = planSelections.stops.includes(business.id);

                return (
                  <article className={isPlanned ? "planner-match is-planned" : "planner-match"} key={business.id}>
                    <div>
                      <span>{isPlanned ? "In plan" : business.category}</span>
                      <h3>{business.name}</h3>
                      <p>
                        {business.location}
                        {business.distanceMiles !== undefined ? ` | ${Math.round(business.distanceMiles)} miles` : ""}
                      </p>
                      {activeDeal ? <strong>{activeDeal.title}</strong> : null}
                    </div>
                    <div>
                      <button type="button" onClick={() => toggleStopPlan(business.id)}>
                        {isPlanned ? "In plan" : "Add to plan"}
                      </button>
                      <TrackedAction
                        businessId={business.id}
                        href={`/business/${business.slug}`}
                        kind="link"
                      >
                        View listing
                      </TrackedAction>
                      <TrackedAction businessId={business.id} href={`tel:${business.phone}`}>
                        Call business
                      </TrackedAction>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state planner-empty-action">
              <strong>No matching local stops within {radiusMiles} miles.</strong>
              <span>Add more checklist items, try a nearby town, or widen the search.</span>
              <button type="button" onClick={() => setRadiusMiles(100)}>
                Try 100 miles
              </button>
            </div>
          )
        ) : null}
      </section>

      {selected.includes("family") ? (
        <section className="planner-card">
          <div className="planner-section-heading">
            <div className="section-heading">
              <p>Step 5</p>
              <h2>Add parks, campgrounds, waterfalls, and photo stops.</h2>
            </div>
            <button type="button" onClick={() => togglePlannerSection("outdoors")}>
              {openSections.outdoors ? "Hide" : `Show ${nearbyOutdoors.length}`}
            </button>
          </div>
          {openSections.outdoors ? (
            nearbyOutdoors.length ? (
              <div className="planner-outdoor-grid">
                {visibleOutdoors.map((stop) => {
                  const outdoorKey = getOutdoorKey(stop);
                  const isPlanned = planSelections.outdoors.includes(outdoorKey);

                  return (
                    <article className={isPlanned ? "is-planned" : ""} key={outdoorKey}>
                      <div className="planner-photo-prompt">
                        <strong>Rider photo needed</strong>
                        <small>Add one after your stop.</small>
                      </div>
                      <span>{isPlanned ? "In plan" : stop.area.name} | {getOutdoorKindLabel(stop.kind)}</span>
                      <h3>{stop.name}</h3>
                      <p>
                        {stop.description}
                        {stop.distanceMiles !== undefined ? ` | ${Math.round(stop.distanceMiles)} miles` : ""}
                      </p>
                      <small>{stop.access}</small>
                      <div className="trail-actions">
                        <button type="button" onClick={() => toggleOutdoorPlan(stop)}>
                          {isPlanned ? "In plan" : "Add to plan"}
                        </button>
                        <a href={stop.url} rel="noreferrer" target="_blank">
                          Open map
                        </a>
                        <a href={`/ride-areas/${stop.area.slug}#trail-reviews`}>
                          Add photo
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state planner-empty-action">
                <strong>No outdoor stops within {radiusMiles} miles.</strong>
                <span>Try a destination chip or widen the search range.</span>
                <button type="button" onClick={() => setRadiusMiles(100)}>
                  Try 100 miles
                </button>
              </div>
            )
          ) : null}
        </section>
      ) : null}

      {mapLinks.length ? (
        <section className="planner-card">
          <div className="planner-section-heading">
            <div className="section-heading">
              <p>Step 6</p>
              <h2>Open quick map searches.</h2>
            </div>
            <button type="button" onClick={() => togglePlannerSection("maps")}>
              {openSections.maps ? "Hide" : `Show ${mapLinks.length}`}
            </button>
          </div>
          {openSections.maps ? (
            <div className="planner-map-link-grid">
              {mapLinks.map((link) => (
                <a href={link.url} key={link.label} rel="noreferrer" target="_blank">
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="planner-card planner-summary">
        <div className="planner-section-heading">
          <div className="section-heading">
            <p>Final step</p>
            <h2>Send this plan to yourself.</h2>
          </div>
          <button type="button" onClick={() => togglePlannerSection("summary")}>
            {openSections.summary ? "Hide" : "Show plan"}
          </button>
        </div>
        {openSections.summary ? (
          <>
            <div className="planner-delivery-card">
              <div>
                <p className="eyebrow">Ready before service drops</p>
                <h3>{locationFilter || "Appalachia"} ride plan</h3>
                <p>
                  {planTrails.length} trails, {planStops.length} local stops, {planOutdoors.length} outdoor stops,
                  and {selectedItems.length} checklist items inside a shareable plan.
                </p>
              </div>
              <div className="planner-delivery-stats">
                <span>{radiusMiles} mi range</span>
                <span>{activePreset?.label ?? "Custom trip"}</span>
                <span>{mapLinks.length} map searches</span>
              </div>
            </div>
            <label className="planner-directions">
              Build your own directions
              <textarea
                placeholder="Example: Meet at cabin at 8:00. Fuel in Matewan. Park trailers at the main lot. Take the easier loop first, lunch at..."
                value={directions}
                onChange={(event) => setDirections(event.target.value)}
              />
            </label>
            <div className="planner-share-panel">
              <label>
                Email plan
                <input
                  inputMode="email"
                  placeholder="you@example.com"
                  type="email"
                  value={shareEmail}
                  onChange={(event) => setShareEmail(event.target.value)}
                />
              </label>
              <label>
                Text plan
                <input
                  inputMode="tel"
                  placeholder="(606) 555-0199"
                  type="tel"
                  value={sharePhone}
                  onChange={(event) => setSharePhone(event.target.value)}
                />
              </label>
              <button type="button" disabled={isSharingPlan} onClick={sendTripPlan}>
                {isSharingPlan ? "Sending..." : "Send my plan"}
              </button>
              {shareStatus ? (
                <p className={shareStatusType === "success" ? "form-success" : "form-error"}>
                  {shareStatus}
                </p>
              ) : null}
            </div>
            <details className="planner-text-details">
              <summary>View full text plan</summary>
              <pre>{tripSummary}</pre>
            </details>
          </>
        ) : null}
      </section>

      <div className="planner-mobile-bar">
        <span>{planTrails.length} trails | {planStops.length} stops | {planOutdoors.length} outdoor</span>
        <button type="button" onClick={copyTripPlan}>
          Copy
        </button>
        <button type="button" onClick={saveOfflinePack}>
          Save
        </button>
      </div>
    </section>
  );
}
