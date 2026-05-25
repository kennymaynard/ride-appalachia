import Link from "next/link";
import type { Business } from "../lib/types";
import { ListingCard } from "./ListingCard";

type Props = {
  listings: Business[];
  emptyText?: string;
};

export function MarketplaceGrid({ listings, emptyText = "No listings yet." }: Props) {
  if (!listings.length) {
    return (
      <article className="empty-marketplace" aria-label={emptyText}>
        <span>Now accepting real partners</span>
        <h3>{emptyText}</h3>
        <p>
          We are keeping this marketplace clean: only approved, real local
          businesses will appear here. Be first in your category or trail town.
        </p>
        <Link href="/business/join">List Your Business</Link>
      </article>
    );
  }

  return (
    <div className="listing-grid">
      {listings.map((business) => (
        <ListingCard key={business.id} business={business} />
      ))}
    </div>
  );
}
