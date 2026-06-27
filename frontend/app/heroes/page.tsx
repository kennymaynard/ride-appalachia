import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Heroes of Appalachia | Appalachia Offroad App",
  description:
    "Hero Verified veteran-owned and first responder-owned businesses across Appalachia.",
};

const heroNav = [
  ["Veteran Businesses", "/marketplace?hero=veteran"],
  ["First Responder Businesses", "/marketplace?hero=responder"],
  ["Veteran Discounts", "/deals?audience=heroes"],
  ["Veteran Events", "/contact"],
  ["Resources", "/contact"],
];

export default function HeroesPage() {
  return (
    <main className="heroes-page heroes-page-compact">
      <section className="heroes-poster-shell" aria-labelledby="heroes-title">
        <div className="heroes-poster-art">
          <div className="heroes-poster-copy">
            <h1 id="heroes-title">Heroes of Appalachia</h1>
            <p>Honoring Veterans, First Responders, and Gold Star Families.</p>
          </div>
          <nav className="heroes-poster-hotspots" aria-label="Heroes sections">
            {heroNav.map(([label, href]) => (
              <Link key={label} href={href}>
                {label}
              </Link>
            ))}
          </nav>
          <Link href="/business/join" className="heroes-poster-join">
            Join For Free Today
          </Link>
        </div>
      </section>
    </main>
  );
}
