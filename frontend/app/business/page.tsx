import Link from "next/link";
import { partnerTiers } from "../../lib/sample-data";

const businessCategories = [
  { title: "Stay", copy: "Cabins, lodges, campgrounds, hotels" },
  { title: "Eat", copy: "Restaurants, grills, coffee, food trucks" },
  { title: "Rentals", copy: "ATV, UTV, trailers, gear" },
  { title: "Repairs", copy: "Parts, tires, belts, emergency help" },
  { title: "Fuel", copy: "Gas, ice, snacks, supplies" },
  { title: "Deals", copy: "Coupons, specials, rider discounts" },
  { title: "Cleaners", copy: "Turnover help for lodging owners" },
  { title: "Sponsors", copy: "Featured placement and campaigns" },
];

const businessSteps = [
  ["1", "Join", "Create your business profile in minutes."],
  ["2", "Customize", "Add photos, phone, location, hours, and deals."],
  ["3", "Get discovered", "Riders find you while planning their trip."],
  ["4", "Grow", "Track clicks, update specials, and sponsor key areas."],
];

export default function BusinessWelcomePage() {
  const coreTiers = partnerTiers.filter((tier) =>
    ["local_business", "lodging_partner", "featured_partner"].includes(tier.id),
  );
  const addOnTiers = partnerTiers.filter((tier) =>
    ["cleaner_partner", "monthly_sponsor"].includes(tier.id),
  );

  return (
    <main className="business-welcome">
      <section className="business-hero">
        <div className="business-hero-copy">
          <p className="eyebrow">For local businesses</p>
          <h1>The off-road hub for Appalachia rider traffic.</h1>
          <p>
            List your lodging, food, fuel, rentals, repairs, services, or deals
            where ATV and UTV riders are already planning the weekend.
          </p>
          <div className="hero-actions">
            <Link href="/business/join">List Your Business</Link>
            <Link href="/business/login">Business Login</Link>
          </div>
        </div>

        <div className="business-hero-panel">
          <strong>Founding partner launch</strong>
          <span>Lock in your early rate and update your own page anytime.</span>
          <ul>
            <li>Coupons and specials</li>
            <li>Basic clicks dashboard</li>
            <li>Sponsorship campaigns</li>
            <li>Lodging cleaner requests</li>
          </ul>
        </div>
      </section>

      <section className="business-pricing-panel">
        <div className="section-heading">
          <p>Founding partner pricing</p>
          <h2>Simple monthly plans.</h2>
        </div>
        <div className="business-price-grid">
          {coreTiers.map((tier) => (
            <article key={tier.id}>
              <span>{tier.name}</span>
              <h3>
                {tier.price}
                <small>/month</small>
              </h3>
              <p>{tier.description}</p>
              <ul>
                {tier.features.slice(0, 3).map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="business-addon-row">
          {addOnTiers.map((tier) => (
            <article key={tier.id}>
              <strong>{tier.name}</strong>
              <span>{tier.price}/month</span>
              <p>{tier.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="business-category-panel">
        <div className="section-heading">
          <p>Everything riders need</p>
          <h2>All in one place.</h2>
        </div>
        <div className="business-category-grid">
          {businessCategories.map((item) => (
            <article key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.copy}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="business-growth-panel">
        <div>
          <p className="eyebrow">Why businesses join</p>
          <h2>Get discovered before riders arrive.</h2>
          <p>
            Riders do not want to hunt through ten websites while hauling a
            trailer. Appalachia Offroad puts the local stop, special, or service
            in the trip plan when it matters.
          </p>
        </div>
        <div className="business-benefit-grid">
          <article>
            <strong>Targeted visibility</strong>
            <span>Show up around the ride towns and categories you serve.</span>
          </article>
          <article>
            <strong>Mobile first</strong>
            <span>Your page is built for riders checking plans on the road.</span>
          </article>
          <article>
            <strong>Self-service updates</strong>
            <span>Add deals, update listing details, and track basic clicks.</span>
          </article>
        </div>
      </section>

      <section className="business-steps-panel">
        <div className="section-heading">
          <p>How it works</p>
          <h2>Join once. Update anytime.</h2>
        </div>
        <div className="business-step-grid">
          {businessSteps.map(([number, title, copy]) => (
            <article key={number}>
              <span>{number}</span>
              <strong>{title}</strong>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="business-final-cta">
        <div>
          <h2>Ready for rider traffic?</h2>
          <p>Start with a founding partner listing and build from there.</p>
        </div>
        <div className="hero-actions">
          <Link href="/business/join">Join Today</Link>
          <Link href="/business/login">Login</Link>
        </div>
      </section>
    </main>
  );
}
