import Link from "next/link";
import { MarketplaceGrid } from "../../components/MarketplaceGrid";
import { getListings } from "../../lib/api";
import type { Category } from "../../lib/types";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    area?: string;
    category?: string;
    hero?: string;
    veteran?: string;
    radius?: string;
  }>;
};

const marketplaceCategories: Array<Exclude<Category, "deals">> = [
  "lodging",
  "food",
  "rentals",
  "repairs",
  "fuel",
];

const marketplaceFilters = [
  { label: "All", category: "all" },
  { label: "Lodging", category: "lodging" },
  { label: "Food", category: "food" },
  { label: "Fuel", category: "fuel" },
  { label: "Repairs", category: "repairs" },
  { label: "Rentals", category: "rentals" },
] as const;

function getCategory(value?: string): Exclude<Category, "deals"> | "all" {
  return marketplaceCategories.includes(value as Exclude<Category, "deals">)
    ? (value as Exclude<Category, "deals">)
    : "all";
}

function getTitle(category: Exclude<Category, "deals"> | "all", area?: string) {
  const label = category === "all" ? "local stops" : category;
  return area ? `${label} near ${area}.` : `Browse ${label}.`;
}

function getMarketplaceHref(params: {
  area?: string;
  category?: string;
  hero?: boolean;
  veteran?: boolean;
}) {
  const next = new URLSearchParams();
  if (params.area) next.set("area", params.area);
  if (params.category && params.category !== "all") next.set("category", params.category);
  if (params.hero) next.set("hero", "1");
  if (params.veteran) next.set("veteran", "1");
  const query = next.toString();
  return query ? `/marketplace?${query}` : "/marketplace";
}

export default async function MarketplacePage({ searchParams }: Props) {
  const { area, category, hero, veteran, radius } = await searchParams;
  const selectedCategory = getCategory(category);
  const heroOnly = hero === "1";
  const veteranOnly = veteran === "1";
  const listings = (await getListings({ category: selectedCategory, location: area })).filter((business) => {
    if (heroOnly && !business.is_featured) return false;
    if (veteranOnly && business.subscription_tier !== "veteran_owned") return false;
    return true;
  });

  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Marketplace</p>
        <h1>{getTitle(selectedCategory, area)}</h1>
        <p>
          Find approved rider-friendly food, rentals, repairs, fuel, lodging,
          and services around Appalachian ride areas.
          {radius ? ` Showing the trip context for a ${radius} mile search.` : ""}
        </p>
        <div className="home-hero-actions" aria-label="Marketplace actions">
          <Link href="/ride-areas">Find Nearby</Link>
          <Link href="/planner">Plan Trip</Link>
        </div>
      </section>
      <section className="marketplace-filter-panel" aria-label="Marketplace filters">
        <div>
          <p className="eyebrow">Filter fast</p>
          <h2>Find the stop you need.</h2>
        </div>
        <div className="marketplace-filter-row">
          {marketplaceFilters.map((filter) => (
            <Link
              className={selectedCategory === filter.category ? "is-active" : ""}
              href={getMarketplaceHref({
                area,
                category: filter.category,
                hero: heroOnly,
                veteran: veteranOnly,
              })}
              key={filter.label}
            >
              {filter.label}
            </Link>
          ))}
          <Link
            className={heroOnly ? "is-active hero-filter" : "hero-filter"}
            href={getMarketplaceHref({
              area,
              category: selectedCategory,
              hero: !heroOnly,
              veteran: veteranOnly,
            })}
          >
            Hero Verified
          </Link>
          <Link
            className={veteranOnly ? "is-active" : ""}
            href={getMarketplaceHref({
              area,
              category: selectedCategory,
              hero: heroOnly,
              veteran: !veteranOnly,
            })}
          >
            Veteran Owned
          </Link>
        </div>
      </section>
      <section className="page-section">
        <MarketplaceGrid listings={listings} emptyText="No approved partners match this search yet." />
      </section>
    </main>
  );
}
