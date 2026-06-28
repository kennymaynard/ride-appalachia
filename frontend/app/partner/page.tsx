import Link from "next/link";
import { BookingMarketplaceSection } from "../../components/BookingMarketplaceSection";
import { TierCard } from "../../components/TierCard";
import { partnerTiers } from "../../lib/sample-data";

export default function PartnerPage() {
  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Local partners</p>
        <h1>Get discovered by riders planning their next weekend.</h1>
        <p>
          Appalachia Offroad gives local businesses listing visibility, deal
          placement, click reporting, and a path toward direct request-to-book
          reservations with calendar sync.
        </p>
        <Link href="/business/join">Join as a partner</Link>
      </section>

      <BookingMarketplaceSection />

      <section className="tier-grid">
        {partnerTiers.map((tier) => (
          <TierCard key={tier.id} tier={tier} />
        ))}
      </section>
    </main>
  );
}
