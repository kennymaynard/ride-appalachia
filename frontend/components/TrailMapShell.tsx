"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getEvents, getListings } from "../lib/api";
import type { Business, RideEvent, RideMapFeature, TrailReview } from "../lib/types";
import type { MapConditionReport, MapPoint } from "./RideAreaMap";

const TrailLeafletMap = dynamic(
  () => import("./TrailLeafletMap").then((module) => module.TrailLeafletMap),
  {
    loading: () => <div className="trail-map-loading">Loading trail map...</div>,
    ssr: false,
  },
);

type Props = {
  activeTitle: string;
  bounds: [[number, number], [number, number]];
  hikingCount: number;
  ohvCount: number;
  points: MapPoint[];
  businesses?: Business[];
  features?: RideMapFeature[];
  riderPhotos?: TrailReview[];
  conditionReports?: MapConditionReport[];
};

export function TrailMapShell(props: Props) {
  const [businesses, setBusinesses] = useState(props.businesses ?? []);
  const [events, setEvents] = useState<RideEvent[]>([]);

  useEffect(() => {
    if (businesses.length) return;
    // The map intentionally keeps every approved business visible; search pages use bounded queries.
    getListings("all").then(setBusinesses).catch(() => undefined);
  }, [businesses.length]);

  useEffect(() => {
    getEvents().then(setEvents).catch(() => undefined);
  }, []);

  return <TrailLeafletMap {...props} businesses={businesses} events={events} />;
}
