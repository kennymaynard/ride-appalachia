import { TripPlanner } from "../../components/TripPlanner";
import { getListings } from "../../lib/api";
import { rideAreas } from "../../lib/sample-data";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ area?: string }>;
};

export default async function PlannerPage({ searchParams }: Props) {
  const { area } = await searchParams;
  const listings = await getListings("all");

  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Trip planner</p>
        <h1>Pick the ride. Build the weekend.</h1>
        <p>
          Choose a town, trails, lodging, food, fuel, wash bays, family stops,
          and backup services. Save the finished plan before you lose service.
        </p>
      </section>

      <TripPlanner areas={rideAreas} initialLocation={area || ""} listings={listings} />
    </main>
  );
}
