import Link from "next/link";
import type { Business } from "../lib/types";
import { BusinessPhoto } from "./BusinessPhoto";
import { TrackedAction } from "./TrackedAction";

type Props = {
  business: Business;
};

export function ListingCard({ business }: Props) {
  const activeDeal = business.deals.find((deal) => deal.is_active);
  const isSponsored =
    business.campaigns.some((campaign) => campaign.status === "active") ||
    business.subscription_tier === "monthly_sponsor";

  return (
    <article className={isSponsored ? "listing-card is-sponsored" : "listing-card"}>
      <div className="listing-image">
        <BusinessPhoto
          alt=""
          category={business.category}
          src={business.photo_url}
        />
        <span>
          {isSponsored ? "Sponsored" : business.is_featured ? "Featured" : business.category}
        </span>
      </div>
      <div className="listing-body">
        <div className="listing-meta">
          <span>{business.category}</span>
          <span>{business.location}</span>
        </div>
        <h3>{business.name}</h3>
        <p>{business.description}</p>
        {activeDeal ? (
          <div className="deal-pill">
            {activeDeal.title}
            {activeDeal.code ? <strong>{activeDeal.code}</strong> : null}
          </div>
        ) : null}
        <div className="listing-actions">
          <Link href={`/business/${business.slug}`}>View Listing</Link>
          <TrackedAction
            businessId={business.id}
            href={`/business/claim?slug=${business.slug}`}
            kind="link"
          >
            Claim
          </TrackedAction>
        </div>
      </div>
    </article>
  );
}
