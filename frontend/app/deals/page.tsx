import Link from "next/link";
import { MarketplaceGrid } from "../../components/MarketplaceGrid";
import { getListings } from "../../lib/api";

type Props = {
  searchParams: Promise<{ area?: string }>;
};

export default async function DealsPage({ searchParams }: Props) {
  const { area } = await searchParams;
  const listings = await getListings({ category: "deals", location: area });

  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Local rider discounts</p>
        <h1>{area ? `Deals near ${area}.` : "Deals worth planning around."}</h1>
        <p>Verified offers from local stays, food, rentals, repair, and fuel stops.</p>
        <Link href="/business/join">Post a deal</Link>
      </section>
      <section className="page-section">
        <MarketplaceGrid listings={listings} emptyText="No active deals yet." />
      </section>
    </main>
  );
}
