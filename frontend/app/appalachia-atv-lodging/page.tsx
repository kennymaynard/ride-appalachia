import Link from "next/link";

export default function AppalachiaAtvLodgingPage() {
  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Appalachia ATV lodging</p>
        <h1>Find rider-friendly places to stay.</h1>
        <p>Browse cabins, lodges, campgrounds, and hotels near Appalachia trail areas as lodging partners come online.</p>
        <Link href="/lodging">Browse Lodging</Link>
      </section>
    </main>
  );
}
