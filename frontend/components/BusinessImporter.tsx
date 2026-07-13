"use client";

import { useMemo, useState } from "react";
import { importOpenStreetMapBusinesses, scanOpenStreetMapBusinesses } from "../lib/api";
import { rideAreas } from "../lib/sample-data";
import type { BusinessImportCandidate } from "../lib/types";

export function BusinessImporter({ adminPassword, onImported }: { adminPassword: string; onImported: () => Promise<void> }) {
  const [areaSlug, setAreaSlug] = useState(rideAreas[0]?.slug || "");
  const [radius, setRadius] = useState(25);
  const [candidates, setCandidates] = useState<BusinessImportCandidate[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [working, setWorking] = useState(false);
  const area = useMemo(() => rideAreas.find((item) => item.slug === areaSlug), [areaSlug]);

  async function scan() {
    if (!area) return;
    setWorking(true); setStatus("Scanning OpenStreetMap…");
    try {
      const found = await scanOpenStreetMapBusinesses({ area_slug: area.slug, area_name: area.name, latitude: area.latitude, longitude: area.longitude, radius_miles: radius }, adminPassword);
      setCandidates(found);
      setSelected(found.filter((item) => !item.duplicate_business_id).map((item) => item.source_id));
      setStatus(`Found ${found.length} candidates; ${found.filter((item) => item.duplicate_business_id).length} possible duplicates.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Scan failed"); }
    finally { setWorking(false); }
  }

  async function importSelected() {
    const rows = candidates.filter((item) => selected.includes(item.source_id) && !item.duplicate_business_id);
    if (!rows.length) return;
    setWorking(true); setStatus("Importing selected businesses…");
    try {
      let imported = 0;
      let skipped = 0;
      for (let index = 0; index < rows.length; index += 250) {
        const batch = rows.slice(index, index + 250);
        setStatus(`Importing ${index + 1}–${index + batch.length} of ${rows.length}…`);
        const result = await importOpenStreetMapBusinesses(batch, adminPassword);
        imported += result.imported;
        skipped += result.skipped;
      }
      setStatus(`Imported ${imported}; skipped ${skipped}. Listings are pending admin approval.`);
      setSelected([]); await onImported();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Import failed"); }
    finally { setWorking(false); }
  }

  return <section className="admin-panel">
    <div className="section-heading"><p className="eyebrow">Business coverage</p><h2>OpenStreetMap importer</h2></div>
    <p>Discover real businesses near one riding area, review duplicates, then import selected listings as unclaimed and pending.</p>
    <div className="admin-actions">
      <select aria-label="Riding area" value={areaSlug} onChange={(event) => setAreaSlug(event.target.value)}>
        {rideAreas.map((item) => <option key={item.slug} value={item.slug}>{item.name} — {item.state}</option>)}
      </select>
      <label>Radius (miles)<input max={50} min={1} type="number" value={radius} onChange={(event) => setRadius(Number(event.target.value))} /></label>
      <button disabled={working} type="button" onClick={scan}>Scan area</button>
      <button disabled={working || selected.length === 0} type="button" onClick={importSelected}>Import selected ({selected.length})</button>
    </div>
    {status ? <p>{status}</p> : null}
    <div className="admin-list">
      {candidates.map((candidate) => <label className="admin-business-card" key={candidate.source_id}>
        <input checked={selected.includes(candidate.source_id)} disabled={Boolean(candidate.duplicate_business_id)} type="checkbox" onChange={() => setSelected((current) => current.includes(candidate.source_id) ? current.filter((id) => id !== candidate.source_id) : [...current, candidate.source_id])} />
        <span><strong>{candidate.name}</strong> · {candidate.category} · {candidate.distance_miles} mi<br />{candidate.location}<br />{candidate.duplicate_reason || "New candidate"} · <a href={candidate.source_url} rel="noreferrer" target="_blank">OSM source</a></span>
      </label>)}
    </div>
  </section>;
}
