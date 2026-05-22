import Link from "next/link";
import { TierCard } from "../../components/TierCard";
import { partnerTiers } from "../../lib/sample-data";

export default function PartnerPage() {
  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Local partners</p>
        <h1>Get discovered by riders planning their next weekend.</h1>
        <p>
          Appalachia Offroad gives local businesses a simple listing, deal placement,
          and click reporting without building a booking engine.
        </p>
        <Link href="/business/join">Join as a partner</Link>
      </section>

      <section className="tier-grid">
        {partnerTiers.map((tier) => (
          <TierCard key={tier.id} tier={tier} />
        ))}
      </section>
    </main>
  );
}
