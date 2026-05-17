import { TripPlanner } from "../../components/TripPlanner";
import { getListings } from "../../lib/api";

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
        <h1>Check what you need. We build the ride road map.</h1>
        <p>
          Start with the weekend essentials, then turn the list into lodging,
          food, fuel, rental, repair, and deal stops.
        </p>
      </section>

      <TripPlanner initialLocation={area || ""} listings={listings} />
    </main>
  );
}
