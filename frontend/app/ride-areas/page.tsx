import { RideAreaFinder } from "../../components/RideAreaFinder";
import { rideAreas } from "../../lib/sample-data";
import { getListings } from "../../lib/api";

export default async function RideAreasPage() {
  const listings = await getListings("all");

  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Find nearby</p>
        <h1>Enter a location. Choose the miles. See what is nearby.</h1>
        <p>
          No more digging through destination boxes. Search once and see trails,
          lodging, food, fuel, rentals, repairs, and deals around the trip.
        </p>
      </section>

      <RideAreaFinder areas={rideAreas} listings={listings} />
    </main>
  );
}
