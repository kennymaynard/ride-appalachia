import type { Metadata } from "next";
import Link from "next/link";
import { TrailTalkEvents } from "../../components/TrailTalkEvents";
import { getEvents } from "../../lib/api";

export const metadata: Metadata = {
  title: "Appalachia Ride Calendar | ATV, UTV, Jeep & Off-Road Events",
  description: "Browse verified ATV, UTV, SxS, Jeep, dirt-bike, and off-road rides across Appalachia.",
  alternates: { canonical: "/ride-calendar" },
  openGraph: {
    title: "Appalachia Offroad Ride Calendar",
    description: "Find verified upcoming rides and build a complete trip around them.",
    url: "https://appalachiaoffroadapp.com/ride-calendar",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

const stateLinks = [["Kentucky", "kentucky"], ["West Virginia", "west-virginia"], ["Virginia", "virginia"], ["Tennessee", "tennessee"], ["North Carolina", "north-carolina"]] as const;

export default async function RideCalendarPage() {
  const events = await getEvents({ verified: true }).catch(() => []);
  return (
    <main className="page ride-calendar-page">
      <section className="page-hero compact">
        <p className="eyebrow">Verified ride calendar</p>
        <h1>Find the ride. Then build the whole trip.</h1>
        <p>Browse approved upcoming rides across Appalachia, share the event with your group, and plan lodging, food, fuel, and repairs nearby.</p>
        <div className="hero-actions"><a href="#calendar">Browse Upcoming Rides</a><Link href="/planner">Build a Plan</Link></div>
      </section>
      <nav className="ride-calendar-state-links" aria-label="Ride calendars by state">
        {stateLinks.map(([label, slug]) => <Link href={`/rides/${slug}`} key={slug}>{label}</Link>)}
      </nav>
      <section id="calendar" className="page-section ride-calendar-content"><TrailTalkEvents initialEvents={events} /></section>
    </main>
  );
}
