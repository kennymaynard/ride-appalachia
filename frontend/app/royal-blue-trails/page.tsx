import Link from "next/link";

export default function RoyalBlueTrailsPage() {
  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Royal Blue trails</p>
        <h1>Plan Royal Blue and Brimstone trips.</h1>
        <p>Compare trail map sources, save nearby stops, and build an offline ride plan for Tennessee off-road weekends.</p>
        <Link href="/ride-areas/royal-blue-tn">Open Royal Blue Trail Pack</Link>
      </section>
    </main>
  );
}
