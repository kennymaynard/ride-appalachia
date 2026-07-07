import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Appalachia Trail Runner Game | Appalachia Offroad",
  description:
    "Play Appalachia Trail Runner, a mobile mini game from Appalachia Offroad with trail levels, garage upgrades, rewards, and links to plan a real ride.",
};

export default function TrailRunnerPage() {
  return (
    <main className="page trail-runner-host">
      <section className="page-hero compact">
        <p className="eyebrow">Mini game</p>
        <h1>Appalachia Trail Runner.</h1>
        <p>
          Dodge trail hazards, collect coins, upgrade the ride, and then open
          Appalachia Offroad to plan the real trip.
        </p>
        <div className="home-hero-actions" aria-label="Trail runner links">
          <Link href="/trail-runner-game/index.html">Open Full Screen</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </section>

      <section className="trail-runner-frame-wrap" aria-label="Playable Trail Runner game">
        <iframe
          className="trail-runner-frame"
          src="/trail-runner-game/index.html"
          title="Appalachia Trail Runner playable game"
          allow="fullscreen"
          allowFullScreen
        />
      </section>
    </main>
  );
}
