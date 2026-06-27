import Link from "next/link";
import { MarketplaceGrid } from "../../components/MarketplaceGrid";
import { getListings } from "../../lib/api";
import type { Category } from "../../lib/types";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    area?: string;
    category?: string;
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

function getCategory(value?: string): Exclude<Category, "deals"> | "all" {
  return marketplaceCategories.includes(value as Exclude<Category, "deals">)
    ? (value as Exclude<Category, "deals">)
    : "all";
}

function getTitle(category: Exclude<Category, "deals"> | "all", area?: string) {
  const label = category === "all" ? "local stops" : category;
  return area ? `${label} near ${area}.` : `Browse ${label}.`;
}

export default async function MarketplacePage({ searchParams }: Props) {
  const { area, category, radius } = await searchParams;
  const selectedCategory = getCategory(category);
  const listings = await getListings({ category: selectedCategory, location: area });

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
          <Link href="/business/join">List Your Business</Link>
          <Link href="/ride-areas">Find Nearby</Link>
        </div>
      </section>
      <section className="page-section">
        <MarketplaceGrid listings={listings} emptyText="No approved partners match this search yet." />
      </section>
    </main>
  );
}
