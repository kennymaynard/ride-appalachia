import Link from "next/link";

export default function RushKyAtvTrailsPage() {
  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Rush KY ATV trails</p>
        <h1>Plan a Rush off-road trip.</h1>
        <p>Find Rush trail information, map links, nearby lodging, fuel, food, repairs, and offline planning tools.</p>
        <Link href="/ride-areas/rush-ky">Open Rush Trail Pack</Link>
      </section>
    </main>
  );
}
