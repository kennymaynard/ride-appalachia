import Link from "next/link";

export default function RushBusinessPartnersPage() {
  return (
    <main className="business-welcome">
      <section className="business-hero">
        <div className="business-hero-copy">
          <p className="eyebrow">Rush business partners</p>
          <h1>Get Found By Riders Visiting Rush Off-Road.</h1>
          <p>
            Riders planning Rush trips need cabins, food, fuel, repairs,
            rentals, events, and deals before they arrive. Put your business
            where the trip gets planned.
          </p>
          <ul className="business-hero-checks">
            <li>Founding pricing starts at $29/month</li>
            <li>First 8 Rush-area partners get early placement</li>
            <li>Free deal placement during launch month</li>
            <li>Direct calls and website clicks from riders</li>
          </ul>
          <div className="hero-actions">
            <Link href="/business#check-availability">Check Availability</Link>
            <Link href="/business/join">Join Now</Link>
          </div>
        </div>
        <div className="business-hero-panel">
          <strong>Rush launch</strong>
          <span>Now onboarding lodging, food, fuel, repairs, rentals, events, and local deals.</span>
        </div>
      </section>
    </main>
  );
}
