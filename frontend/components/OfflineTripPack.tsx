"use client";

import { useEffect, useState } from "react";

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
    category: string;
    name: string;
    location: string;
    phone: string;
    website_url: string;
    deal?: string;
  }>;
};

const offlinePackKey = "ride-appalachia-offline-trip-pack";

export function OfflineTripPack() {
  const [pack, setPack] = useState<OfflineTripPack>();

  useEffect(() => {
    const savedPack = window.localStorage.getItem(offlinePackKey);
    if (!savedPack) return;

    try {
      setPack(JSON.parse(savedPack));
    } catch {
      window.localStorage.removeItem(offlinePackKey);
    }
  }, []);

  if (!pack) {
    return (
      <section className="offline-pack">
        <p className="empty-state">
          No offline trip pack saved on this device yet. Build a plan, then tap
          Save Offline.
        </p>
      </section>
    );
  }

  return (
    <section className="offline-pack">
      <div className="offline-pack-header">
        <div>
          <p className="eyebrow">Offline mode</p>
          <h2>{pack.destination}</h2>
          <p>
            Saved {new Date(pack.savedAt).toLocaleString()} • {pack.radiusMiles} mile
            range
          </p>
        </div>
        <button type="button" onClick={() => window.print()}>
          Print
        </button>
      </div>

      <div className="offline-pack-grid">
        <article>
          <span>Checklist</span>
          <ul>
            {pack.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article>
          <span>Your directions</span>
          <p>{pack.directions || "No custom directions saved yet."}</p>
        </article>
      </div>

      <div className="offline-pack-section">
        <div className="section-heading">
          <p>Trails</p>
          <h2>Saved trail references.</h2>
        </div>
        <div className="offline-pack-list">
          {pack.trails.map((trail) => (
            <article key={`${trail.area}-${trail.name}`}>
              <span>{trail.area}</span>
              <h3>{trail.name}</h3>
              <p>
                {trail.activity ?? "Trail"} • {trail.difficulty}
                {trail.latitude && trail.longitude
                  ? ` • ${trail.latitude.toFixed(5)}, ${trail.longitude.toFixed(5)}`
                  : ""}
              </p>
              <p>{trail.access}</p>
              <a href={trail.url} rel="noreferrer" target="_blank">
                Official map
              </a>
            </article>
          ))}
        </div>
      </div>

      <div className="offline-pack-section">
        <div className="section-heading">
          <p>Places</p>
          <h2>Saved stops and contacts.</h2>
        </div>
        <div className="offline-pack-list">
          {pack.stops.map((stop) => (
            <article key={`${stop.category}-${stop.name}`}>
              <span>{stop.category}</span>
              <h3>{stop.name}</h3>
              <p>{stop.location}</p>
              <p>{stop.phone}</p>
              {stop.deal ? <strong>{stop.deal}</strong> : null}
              <a href={stop.website_url || `tel:${stop.phone}`}>
                {stop.website_url ? "Website" : "Call"}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
