import type { Business } from "../lib/types";
import { ListingCard } from "./ListingCard";

type Props = {
  listings: Business[];
  emptyText?: string;
};

const demoListings = [
  ["Mountain View Cabin", "Lodging", "Founding lodging partners coming soon."],
  ["Trailside Grill", "Food", "Group-friendly rider meals coming soon."],
  ["Appalachian Powersports Repair", "Repairs", "Parts, tires, and service partners coming soon."],
  ["Fuel Stop Near Rush", "Fuel", "Fuel, ice, snacks, and supply stops coming soon."],
];

export function MarketplaceGrid({ listings, emptyText = "No listings yet." }: Props) {
  if (!listings.length) {
    return (
      <div className="listing-grid demo-listing-grid" aria-label={emptyText}>
        {demoListings.map(([name, category, description]) => (
          <article className="demo-listing-card" key={name}>
            <span>{category}</span>
            <h3>{name}</h3>
            <p>{description}</p>
            <strong>Founding partners coming soon</strong>
          </article>
        ))}
      </div>
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
