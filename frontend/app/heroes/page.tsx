import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Heroes of Appalachia | Appalachia Offroad App",
  description:
    "Hero Verified veteran-owned and first responder-owned businesses across Appalachia.",
};

const heroNav = [
  ["Veteran Businesses", "#hero-businesses"],
  ["First Responder Businesses", "#hero-businesses"],
  ["Veteran Discounts", "#hero-businesses"],
  ["Veteran Events", "#hero-join"],
  ["Resources", "#hero-join"],
];

const heroCards = [
  {
    image: "/images/appalachia-offroad-veteran-owned.png",
    icon: "★",
    title: "Veteran-Owned Businesses",
    copy: "Find and support businesses owned by veterans across Eastern Kentucky and Appalachia.",
    cta: "Browse Businesses",
    href: "/marketplace?hero=veteran",
  },
  {
    image: "/appalachia-offroad-hero.png",
    icon: "🛡",
    title: "First Responder-Owned Businesses",
    copy: "Support local businesses owned by firefighters, law enforcement, EMS, dispatchers, and corrections.",
    cta: "Browse Businesses",
    href: "/marketplace?hero=responder",
  },
  {
    image: "/images/hero-verified-badge.png",
    icon: "🛡",
    title: "Hero Verified",
    copy: "Verified veteran and first responder businesses receive a premium badge inside the app.",
    cta: "Learn More",
    href: "#hero-verified",
  },
  {
    image: "/appalachia-offroad-hero.png",
    icon: "💥",
    title: "Free Partner Membership",
    copy: "Business Partner Memberships are free for veteran-owned and first responder-owned businesses.",
    cta: "Join For Free",
    href: "/business/join",
  },
];

const footerBadges = [
  ["🛡", "Veteran Owned & Operated"],
  ["♡", "Support Local Heroes"],
  ["⛰", "Ride. Stay. Explore."],
  ["🤝", "Together, We Ride Strong."],
  ["★", "Honor • Respect • Gratitude"],
];

const comingNext = [
  "Verified Discounts",
  "Hero-Friendly Map",
  "Veteran Rides",
  "Gold Star Supporters",
  "Outdoor Therapy Resources",
  "Give Back",
];

export default function HeroesPage() {
  return (
    <main className="heroes-page heroes-page-compact">
      <section className="heroes-hero compact-heroes-hero">
        <div className="heroes-overlay compact-heroes-overlay">
          <div className="heroes-content compact-heroes-content">
            <img
              src="/images/appalachia-offroad-veteran-owned.png"
              alt="Appalachia Offroad App Veteran Owned and Operated"
              className="heroes-logo compact-heroes-logo"
            />
            <div className="compact-heroes-copy">
              <p className="heroes-badge">Veteran Owned & Operated</p>
              <h1>Heroes of Appalachia</h1>
              <p className="heroes-subtitle">
                Honoring Veterans • First Responders • Gold Star Families
              </p>
              <blockquote>
                The freedom to explore these mountains exists because others chose to serve.
              </blockquote>
            </div>
          </div>

          <nav className="compact-heroes-nav" aria-label="Heroes sections">
            {heroNav.map(([label, href]) => (
              <a key={label} href={href}>
                {label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section className="heroes-section compact-support-section">
        <p className="heroes-kicker">Supporting Those Who Serve</p>
        <h2>Supporting Those Who Serve</h2>
        <p>
          Appalachia Offroad App proudly supports veteran-owned and first
          responder-owned businesses. These men and women have served our country,
          protected our communities, and now continue building something strong
          right here in Appalachia.
        </p>
      </section>

      <section className="heroes-grid compact-card-grid" id="hero-businesses">
        {heroCards.map((card) => (
          <article className="hero-card compact-hero-card" key={card.title}>
            <div
              className="compact-card-image"
              style={{ backgroundImage: `url("${card.image}")` }}
              aria-hidden="true"
            />
            <span>{card.icon}</span>
            <h3>{card.title}</h3>
            <p>{card.copy}</p>
            <Link href={card.href}>{card.cta}</Link>
          </article>
        ))}
      </section>

      <section className="compact-hero-verified" id="hero-verified">
        <img
          src="/images/hero-verified-badge.png"
          alt="Appalachia Offroad App Hero Verified Badge"
        />
        <div>
          <p className="heroes-kicker">Appalachia Offroad App</p>
          <h2>Hero Verified</h2>
          <p>
            Verified Veteran-Owned or First Responder-Owned businesses receive a
            badge they can proudly display in the app, on their website, and on
            social media.
          </p>
        </div>
      </section>

      <section className="heroes-callout compact-heroes-callout" id="hero-join">
        <h2>You Served Us. Let Us Serve You.</h2>
        <p>
          If you own a veteran or first responder business, join Appalachia
          Offroad App for free and get your business in front of riders exploring
          the mountains.
        </p>
        <Link href="/business/join" className="heroes-cta">
          Join For Free Today
        </Link>
      </section>

      <section className="compact-coming-next" aria-label="Coming next">
        {comingNext.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </section>

      <section className="compact-heroes-footer" aria-label="Hero values">
        {footerBadges.map(([icon, label]) => (
          <span key={label}>
            <b>{icon}</b>
            {label}
          </span>
        ))}
      </section>
    </main>
  );
}
