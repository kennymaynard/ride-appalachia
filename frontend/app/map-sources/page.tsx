import { TrailMapSourceChecklist } from "../../components/TrailMapSourceChecklist";
import { rideAreas } from "../../lib/sample-data";

export default function MapSourcesPage() {
  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Map source checklist</p>
        <h1>Use public maps now. Import exact trail files only when verified.</h1>
        <p>
          Track which trails already have usable public maps, which have
          downloadable files, and which land managers or trail operators still
          need to be contacted for current GPX, KMZ, GeoJSON, rules, and
          permission.
        </p>
      </section>
      <TrailMapSourceChecklist areas={rideAreas} />
    </main>
  );
}
