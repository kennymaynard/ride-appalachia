import Link from "next/link";

export default function AtvRepairsNearRushPage() {
  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">ATV repairs near Rush</p>
        <h1>Find repair backup before you ride.</h1>
        <p>Plan parts, tires, emergency repairs, fuel, and nearby stops for a Rush off-road trip.</p>
        <Link href="/marketplace?category=repairs&area=Rush">Browse Repair Stops</Link>
      </section>
    </main>
  );
}
