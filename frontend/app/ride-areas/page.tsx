import Link from "next/link";
import { RideAreaFinder } from "../../components/RideAreaFinder";
import { RideAreaGrid } from "../../components/RideAreaGrid";
import { RideAreaMap } from "../../components/RideAreaMap";
import { rideAreas, trailReviews } from "../../lib/sample-data";

export default function RideAreasPage() {

  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Find nearby</p>
        <h1>Enter a location. Choose the miles. See what is nearby.</h1>
        <p>
          No more digging through destination boxes. Search once and see trails,
          lodging, food, fuel, rentals, repairs, and deals around the trip.
        </p>
        <Link href="/map-sources">Open map source checklist</Link>
      </section>

      <section className="page-section ride-area-browse-section">
        <div className="section-heading">
          <p className="eyebrow">Ride cards</p>
          <h2>Know the trip before you tap.</h2>
        </div>
        <RideAreaGrid areas={rideAreas.slice(0, 9)} />
      </section>

      <RideAreaFinder areas={rideAreas} listings={[]} />
      <RideAreaMap areas={rideAreas} businesses={[]} reviews={trailReviews} />
    </main>
  );
}
