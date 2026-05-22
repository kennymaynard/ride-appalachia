import Link from "next/link";
import { MarketplaceGrid } from "../../components/MarketplaceGrid";
import { getListings } from "../../lib/api";

export default async function DealsPage() {
  const listings = await getListings("deals");

  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Local rider discounts</p>
        <h1>Deals worth planning around.</h1>
        <p>Verified offers from local stays, food, rentals, repair, and fuel stops.</p>
        <Link href="/business/join">Post a deal</Link>
      </section>
      <section className="page-section">
        <MarketplaceGrid listings={listings} emptyText="No active deals yet." />
      </section>
    </main>
  );
}
