"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./RideAreaMap";

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
};

export function TrailMapShell(props: Props) {
  return <TrailLeafletMap {...props} />;
}
