import type { Metadata } from "next";
import { TrailTalkBoard } from "../../components/TrailTalkBoard";
import { getTrailTalkPosts } from "../../lib/api";
import { getEvents } from "../../lib/api";
import { TrailTalkEvents } from "../../components/TrailTalkEvents";
import { rideAreas } from "../../lib/sample-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trail Talk | Appalachia Offroad App",
  description:
    "Community ride posts, trail condition updates, group rides, events, and rider help across Appalachia.",
};

export default async function TrailTalkPage() {
  const [posts, events] = await Promise.all([getTrailTalkPosts(), getEvents({ verified: true }).catch(() => [])]);

  return (
    <main className="page trail-talk-page">
      <section className="page-hero compact">
        <p className="eyebrow">Trail Talk</p>
        <h1>Ride plans, trail conditions, and community updates.</h1>
        <p>
          Find group rides, ask for repair help, share trail conditions, and keep
          up with what riders are seeing across Appalachia.
        </p>
        <div className="hero-actions"><a href="/ride-calendar">Open Ride Calendar</a></div>
      </section>

      <section className="page-section">
        <TrailTalkEvents initialEvents={events} />
        <TrailTalkBoard areas={rideAreas} initialPosts={posts} />
      </section>
    </main>
  );
}
