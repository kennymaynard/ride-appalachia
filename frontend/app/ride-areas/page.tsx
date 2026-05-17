import { RideAreaFinder } from "../../components/RideAreaFinder";
import { RideAreaGrid } from "../../components/RideAreaGrid";
import { RideAreaMap } from "../../components/RideAreaMap";
import { rideAreas } from "../../lib/sample-data";

export default function RideAreasPage() {
  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Ride areas</p>
        <h1>Start with where you are riding.</h1>
        <p>
          Pick a destination, then build a plan around nearby lodging, food, fuel,
          rentals, repairs, and deals.
        </p>
      </section>

      <RideAreaFinder areas={rideAreas} />
      <RideAreaMap areas={rideAreas} />

      <section className="page-section">
        <div className="section-heading">
          <p>Destinations</p>
          <h2>Appalachian ride anchors</h2>
        </div>
        <RideAreaGrid areas={rideAreas} />
      </section>
    </main>
  );
}
