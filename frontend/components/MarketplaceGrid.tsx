import type { Business } from "../lib/types";
import { ListingCard } from "./ListingCard";

type Props = {
  listings: Business[];
  emptyText?: string;
};

export function MarketplaceGrid({ listings, emptyText = "No listings yet." }: Props) {
  if (!listings.length) {
    return <p className="empty-state">{emptyText}</p>;
  }

  return (
    <div className="listing-grid">
      {listings.map((business) => (
        <ListingCard key={business.id} business={business} />
      ))}
    </div>
  );
}
