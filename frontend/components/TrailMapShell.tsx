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
    const [[minLatitude, minLongitude], [maxLatitude, maxLongitude]] = props.bounds;
    getListings({
      category: "all",
      limit: 500,
      minLatitude,
      maxLatitude,
      minLongitude,
      maxLongitude,
    }).then((loaded) => {
      setBusinesses((current) => {
        const merged = new Map(current.map((business) => [business.id, business]));
        loaded.forEach((business) => merged.set(business.id, business));
        return Array.from(merged.values());
      });
    }).catch(() => undefined);
  }, [props.bounds]);

  useEffect(() => {
    getEvents().then(setEvents).catch(() => undefined);
  }, []);

  const searchBusinesses = (query: string) => getListings({ category: "all", q: query, limit: 20 });

  return (
    <TrailLeafletMap
      {...props}
      businesses={businesses}
      events={events}
      onBusinessSearch={searchBusinesses}
    />
  );
}
