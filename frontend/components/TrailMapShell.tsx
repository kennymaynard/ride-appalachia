"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const businessRequest = useRef(0);

  const loadViewportBusinesses = useCallback((
    bounds: [[number, number], [number, number]],
    zoom: number,
  ) => {
    const request = ++businessRequest.current;
    const [[minLatitude, minLongitude], [maxLatitude, maxLongitude]] = bounds;
    getListings({
      category: "all",
      featured: zoom < 8 ? true : undefined,
      limit: 500,
      minLatitude,
      maxLatitude,
      minLongitude,
      maxLongitude,
    }).then((loaded) => {
      if (request !== businessRequest.current) return;
      const protectedBusinesses = (props.businesses ?? []).filter(
        (business) => business.is_featured || ["active", "trialing"].includes(business.subscription_status),
      );
      const next = new Map(protectedBusinesses.map((business) => [business.id, business]));
      loaded.forEach((business) => next.set(business.id, business));
      setBusinesses(Array.from(next.values()));
    }).catch(() => undefined);
  }, [props.businesses]);

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
      onBusinessViewportChange={loadViewportBusinesses}
    />
  );
}
