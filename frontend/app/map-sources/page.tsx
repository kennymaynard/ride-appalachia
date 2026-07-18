import { RideAreaMap } from "../../components/RideAreaMap";
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
      <section className="page-section map-source-live-map" id="in-app-map">
        <div className="section-heading">
          <p>In-app trail map</p>
          <h2>Trail sources displayed without leaving the app.</h2>
        </div>
        <p className="map-source-note">
          Solid route lines are exact imported geometry. Dashed route lines are
          in-app planning corridors based on verified trail source locations
          until the official GPX, KMZ, or GeoJSON files are imported.
        </p>
        <RideAreaMap areas={rideAreas} businesses={[]} compact />
      </section>
      <TrailMapSourceChecklist areas={rideAreas} />
    </main>
  );
}
