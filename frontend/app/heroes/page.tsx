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

const heroCards = [
  ["Browse Businesses", "/marketplace?hero=veteran", "Veteran-owned businesses"],
  ["Browse Businesses", "/marketplace?hero=responder", "First responder-owned businesses"],
  ["Learn More", "/contact", "Hero Verified"],
  ["Join For Free", "/business/join", "Free partner membership"],
];

const heroFooterLinks = [
  ["Veteran Owned & Operated", "/marketplace?hero=veteran"],
  ["Support Local Heroes", "/marketplace?hero=responder"],
  ["Ride. Stay. Explore.", "/ride-areas"],
  ["Together, We Ride Strong.", "/contact"],
  ["Honor • Respect • Gratitude", "/contact"],
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
          <div className="heroes-poster-card-links" aria-label="Heroes feature actions">
            {heroCards.map(([label, href, ariaLabel]) => (
              <Link key={ariaLabel} href={href} aria-label={ariaLabel}>
                {label}
              </Link>
            ))}
          </div>
          <Link href="/business/join" className="heroes-poster-join">
            Join For Free Today
          </Link>
          <div className="heroes-poster-footer-links" aria-label="Heroes footer links">
            {heroFooterLinks.map(([label, href]) => (
              <Link key={label} href={href}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
