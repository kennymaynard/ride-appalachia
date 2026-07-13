"use client";

import { useMemo, useState } from "react";
import { activateExistingImportedBusinesses, importOpenStreetMapBusinesses, scanOpenStreetMapBusinesses } from "../lib/api";
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
  const importedCandidates = useMemo(() => candidates.filter((item) => item.duplicate_reason.startsWith("Already imported")), [candidates]);
  const availableCandidates = useMemo(() => candidates.filter((item) => !item.duplicate_reason.startsWith("Already imported")), [candidates]);

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
      setStatus(`Imported and approved ${imported}; skipped ${skipped}. Listings are now available to the map.`);
      setSelected([]); await onImported(); await scan();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Import failed"); }
    finally { setWorking(false); }
  }

  async function activateExisting() {
    setWorking(true); setStatus("Activating previously imported businesses…");
    try {
      const result = await activateExistingImportedBusinesses(adminPassword);
      setStatus(`Activated ${result.activated} previously imported businesses for the public map.`);
      await onImported();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Activation failed"); }
    finally { setWorking(false); }
  }

  return <section className="admin-panel">
    <div className="section-heading"><p className="eyebrow">Business coverage</p><h2>OpenStreetMap importer</h2></div>
    <p>Discover real businesses near one riding area. Admin-selected imports are approved immediately but remain unclaimed until ownership proof is reviewed.</p>
    <div className="admin-actions">
      <select aria-label="Riding area" value={areaSlug} onChange={(event) => setAreaSlug(event.target.value)}>
        {rideAreas.map((item) => <option key={item.slug} value={item.slug}>{item.name} — {item.state}</option>)}
      </select>
      <label>Radius (miles)<input max={50} min={1} type="number" value={radius} onChange={(event) => setRadius(Number(event.target.value))} /></label>
      <button disabled={working} type="button" onClick={scan}>Scan area</button>
      <button disabled={working || selected.length === 0} type="button" onClick={importSelected}>Import selected ({selected.length})</button>
      <button disabled={working} type="button" onClick={activateExisting}>Activate earlier imports</button>
    </div>
    {status ? <p>{status}</p> : null}
    <div className="admin-list">
      {availableCandidates.map((candidate) => <label className="admin-business-card" key={candidate.source_id}>
        <input checked={selected.includes(candidate.source_id)} disabled={Boolean(candidate.duplicate_business_id)} type="checkbox" onChange={() => setSelected((current) => current.includes(candidate.source_id) ? current.filter((id) => id !== candidate.source_id) : [...current, candidate.source_id])} />
        <span><strong>{candidate.name}</strong> · {candidate.category} · {candidate.distance_miles} mi<br />{candidate.location}<br />{candidate.duplicate_reason || "New candidate"} · <a href={candidate.source_url} rel="noreferrer" target="_blank">OSM source</a></span>
      </label>)}
    </div>
    {importedCandidates.length ? <details>
      <summary>Businesses imported ({importedCandidates.length})</summary>
      <div className="admin-list">
        {importedCandidates.map((candidate) => <article className="admin-business-card" key={candidate.source_id}>
          <span><strong>{candidate.name}</strong> · {candidate.category} · {candidate.distance_miles} mi<br />{candidate.location}<br /><a href={candidate.source_url} rel="noreferrer" target="_blank">OSM source</a></span>
        </article>)}
      </div>
    </details> : null}
  </section>;
}
