import Link from "next/link";

export default function HarlanCountyRidingPage() {
  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Harlan County riding</p>
        <h1>Plan a Harlan County ride weekend.</h1>
        <p>Use Appalachia Offroad to find Harlan County trail resources, rider stops, lodging, repairs, fuel, and offline notes.</p>
        <Link href="/ride-areas/harlan-ky">Open Harlan Trail Pack</Link>
      </section>
    </main>
  );
}
