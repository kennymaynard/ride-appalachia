"use client";

import { useEffect, useState } from "react";
import { GeoJSON } from "react-leaflet";
import type { GeoJsonObject } from "geojson";

const service = "https://services5.arcgis.com/RMHPuOW5MJ6iyTV6/arcgis/rest/services/KDFWR_Elk_Hunting_Areas_WFL1_1/FeatureServer";

const layers = [
  { id: 6, group: "hunting", name: "Elk hunting unit", color: "#f0a33a", fillOpacity: 0.08 },
  { id: 5, group: "hunting", name: "Public hunting area", color: "#6cac49", fillOpacity: 0.16 },
  { id: 4, group: "regulated", name: "Regulated area (RA)", color: "#dc6547", fillOpacity: 0.2 },
  { id: 3, group: "viewing", name: "Elk viewing / restricted no-hunt area", color: "#8f62c9", fillOpacity: 0.28 },
] as const;

type LoadedLayer = (typeof layers)[number] & { data: GeoJsonObject };

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

function featureLabel(properties: Record<string, unknown>) {
  const entry = Object.entries(properties).find(([key, value]) =>
    value && /(unit|name|tract|area)/i.test(key) && !/(shape|acre|object|global)/i.test(key),
  );
  return entry ? escapeHtml(entry[1]) : "Kentucky elk area";
}

type ElkLayerGroup = (typeof layers)[number]["group"];

export function KentuckyElkLayers({ groups }: { groups: ElkLayerGroup[] }) {
  const [loaded, setLoaded] = useState<LoadedLayer[]>([]);
  const groupKey = groups.join(",");

  useEffect(() => {
    const controller = new AbortController();
    const activeGroups = groupKey.split(",");
    Promise.allSettled(
      layers.filter((layer) => activeGroups.includes(layer.group)).map(async (layer) => {
        const response = await fetch(
          `${service}/${layer.id}/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(`Unable to load ${layer.name}`);
        return { ...layer, data: (await response.json()) as GeoJsonObject };
      }),
    ).then((results) => {
      if (!controller.signal.aborted) {
        setLoaded(results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []));
      }
    });
    return () => controller.abort();
  }, [groupKey]);

  return loaded.map((layer) => (
    <GeoJSON
      data={layer.data}
      key={layer.id}
      onEachFeature={(feature, leafletLayer) => {
        const properties = (feature.properties ?? {}) as Record<string, unknown>;
        leafletLayer.bindPopup(
          `<div class="trail-popup"><strong>${featureLabel(properties)}</strong><span>${escapeHtml(layer.name)}</span><p>Official Kentucky Fish & Wildlife planning layer. Verify your drawn unit, tract authorization, current regulations, signs, and land access before hunting.</p><a href="https://fw.ky.gov/Hunt/Pages/ElkHuntingInfo.aspx" target="_blank" rel="noreferrer">Open current elk rules</a></div>`,
        );
      }}
      style={{ color: layer.color, fillColor: layer.color, fillOpacity: layer.fillOpacity, weight: 2 }}
    />
  ));
}
