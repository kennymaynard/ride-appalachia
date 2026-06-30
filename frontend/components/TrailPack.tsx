"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getTrailMapSource, getTrailMapStatusLabel } from "../lib/trail-map-sources";
import type { Business, Category, RideArea } from "../lib/types";

type Props = {
  area: RideArea;
  listings: Business[];
};

type OfflineTripPack = {
  destination: string;
  radiusMiles: number;
  savedAt: string;
  checklist: string[];
  directions: string;
  trails: Array<{
    area: string;
    name: string;
    access: string;
    difficulty: string;
    activity?: string;
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
};

const offlinePackKey = "ride-appalachia-offline-trip-pack";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function writeStoredValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function TrailPack({ area, listings }: Props) {
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const sourceSummary = useMemo(
    () => area.trails.map((trail) => getTrailMapSource(area, trail)),
    [area],
  );
  const downloadReady = sourceSummary.filter(
    (source) => source.status === "download_ready",
  );
  const publicMaps = sourceSummary.filter(
    (source) => source.status === "available_public",
  );
  const contactNeeded = sourceSummary.filter(
    (source) => source.status === "needs_contact",
  );
  const essentialStops = listings.slice(0, 6);

  function buildPack(): OfflineTripPack {
    return {
      destination: area.name,
      radiusMiles: 50,
      savedAt: new Date().toISOString(),
      checklist: [
        ...area.checklist,
        "Download or open official maps before leaving service",
        "Confirm closures, permits, weather, and trail rules",
        "Save emergency contacts and regroup points",
      ],
      directions: notes,
      trails: area.trails.map((trail) => ({
        area: area.name,
        name: trail.name,
        access: trail.access,
        difficulty: trail.difficulty,
        activity: trail.activity,
        latitude: trail.latitude ?? area.latitude,
        longitude: trail.longitude ?? area.longitude,
        url: trail.url,
      })),
      stops: essentialStops.map((business) => {
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
    };
  }

  function saveOffline() {
    if (writeStoredValue(offlinePackKey, JSON.stringify(buildPack()))) {
      setStatus(`${area.name} Trail Pack saved offline on this device.`);
    } else {
      setStatus("Offline save was blocked. Download the trail pack instead.");
    }
  }

  function downloadPack() {
    downloadJson(`${slugify(area.name)}-trail-pack.json`, buildPack());
    setStatus(`${area.name} Trail Pack downloaded.`);
  }

  return (
    <section className="trail-pack">
      <div className="trail-pack-header">
        <div>
          <p className="eyebrow">Trail Pack</p>
          <h2>{area.name} ride and hike pack</h2>
          <p>
            Official maps where available, honest source status, local stops,
            safety checklist, and your own directions in one offline-ready pack.
          </p>
        </div>
        <div className="trail-pack-actions">
          <button type="button" onClick={saveOffline}>
            Save Offline
          </button>
          <button type="button" onClick={downloadPack}>
            Download Pack
          </button>
          <Link href="/offline">Open Offline</Link>
        </div>
      </div>

      <div className="trail-pack-stats" aria-label="Trail Pack map status">
        <article>
          <strong>{area.trails.length}</strong>
          <span>Trail references</span>
        </article>
        <article>
          <strong>{publicMaps.length}</strong>
          <span>Public maps</span>
        </article>
        <article>
          <strong>{downloadReady.length}</strong>
          <span>Downloads</span>
        </article>
        <article>
          <strong>{contactNeeded.length}</strong>
          <span>Needs contact</span>
        </article>
      </div>

      <div className="trail-pack-grid">
        <article>
          <span>Map sources</span>
          <div className="trail-pack-map-list">
            {sourceSummary.slice(0, 6).map((source) => (
              <a href={source.mapUrl} key={source.trailName} rel="noreferrer" target="_blank">
                <strong>{source.trailName}</strong>
                <small>{getTrailMapStatusLabel(source.status)}</small>
              </a>
            ))}
          </div>
          <Link className="trail-pack-text-link" href="/map-sources">
            Full source checklist
          </Link>
        </article>

        <article>
          <span>Before you go</span>
          <div className="ride-area-checklist">
            {[
              ...area.checklist,
              "Download maps and pack",
              "Confirm closures and permits",
              "Share route plan with group",
            ].map((item) => (
              <label key={item}>
                <input type="checkbox" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </article>

        <article>
          <span>Local stops</span>
          <div className="trail-pack-stop-list">
            {essentialStops.length ? (
              essentialStops.map((business) => (
                <div key={business.id}>
                  <strong>{business.name}</strong>
                  <small>
                    {business.category} • {business.location} • {business.phone}
                  </small>
                </div>
              ))
            ) : (
              <p>No marketplace stops added for this area yet.</p>
            )}
          </div>
        </article>

        <article>
          <span>Your directions</span>
          <textarea
            placeholder="Meetup, parking, fuel stop, easy loop first, photo stops, lunch plan, backup route..."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          {status ? <p className="trail-pack-status">{status}</p> : null}
        </article>
      </div>
    </section>
  );
}
