"use client";

import { useRouter } from "next/navigation";
import type { ExploreDestination } from "../lib/types";

export const exploreTripStorageKey = "aoa_explore_trip_stops";

export type ExploreTripStop = Pick<ExploreDestination, "id" | "name" | "slug" | "category" | "address" | "city" | "state" | "latitude" | "longitude" | "hours_json"> & {
  arrivalNotes?: string;
  day?: number;
};

function readStops(): ExploreTripStop[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(exploreTripStorageKey) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function AddExploreToTrip({ destination, compact = false }: { destination: ExploreDestination; compact?: boolean }) {
  const router = useRouter();
  function add() {
    const stops = readStops();
    if (!stops.some((stop) => stop.id === destination.id)) {
      stops.push({ id: destination.id, name: destination.name, slug: destination.slug, category: destination.category, address: destination.address, city: destination.city, state: destination.state, latitude: destination.latitude, longitude: destination.longitude, hours_json: destination.hours_json, arrivalNotes: "", day: 1 });
      window.localStorage.setItem(exploreTripStorageKey, JSON.stringify(stops));
    }
    const area = [destination.city, destination.state].filter(Boolean).join(" ");
    router.push(`/planner${area ? `?area=${encodeURIComponent(area)}` : ""}#explore-trip-stops`);
  }
  return <button className={compact ? "explore-add-compact" : ""} type="button" onClick={add}>Add to Trip</button>;
}
