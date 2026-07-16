import Link from "next/link";
import { MarketplaceGrid } from "../../components/MarketplaceGrid";
import { getListings } from "../../lib/api";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ area?: string }>;
};

export default async function LodgingPage({ searchParams }: Props) {
  const { area } = await searchParams;
  const listings = (await getListings({ category: "lodging", location: area })).sort(
    (a, b) => Number(b.is_featured) - Number(a.is_featured),
  );

  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Rider-friendly stays</p>
        <h1>{area ? `Lodging near ${area}.` : "Lodging near the trails."}</h1>
        <p>Cabins, campgrounds, hotels, and group stays with trailer-aware amenities.</p>
        <Link href="/ride-areas">Find Trails & Stops</Link>
      </section>
      <section className="page-section">
        <MarketplaceGrid listings={listings} emptyText="No approved lodging partners yet." />
      </section>
    </main>
  );
}
