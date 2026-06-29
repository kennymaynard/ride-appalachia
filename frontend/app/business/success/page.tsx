import Link from "next/link";
import { getBusinessByAccessToken } from "../../../lib/api";
import { partnerTiers } from "../../../lib/sample-data";
import type { Tier } from "../../../lib/types";

type Props = {
  searchParams: Promise<{
    business_id?: string;
    checkout?: string;
    booking?: string;
    booking_ids?: string;
    tier?: Tier["id"];
    access_token?: string;
  }>;
};

function checkoutLabel(checkout?: string) {
  if (checkout === "free") return "Free plan submitted";
  if (checkout === "stub") return "Checkout stub complete";
  return "Checkout complete";
}

export default async function BusinessSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const bookingIds = params.booking_ids?.split(",").filter(Boolean) || [];
  const isBookingCheckout = params.booking === "success" || params.booking === "stub";
  const business = params.access_token
    ? await getBusinessByAccessToken(params.access_token)
    : null;
  const selectedTier =
    partnerTiers.find((tier) => tier.id === params.tier) || partnerTiers[0];
  const isFreeTier = selectedTier.id === "veteran_owned";

  return (
    <main className="page">
      <section className="page-hero compact success-hero">
        <p className="eyebrow">
          {isBookingCheckout ? "Booking checkout complete" : checkoutLabel(params.checkout)}
        </p>
        <h1>
          {isBookingCheckout
            ? "Your trip booking payment is complete."
            : "Your listing is in the Appalachia Offroad pipeline."}
        </h1>
        <p>
          {isBookingCheckout
            ? "You can look up your booking, review the cancellation policy, and request cancellation if plans change."
            : "We received the partner tier and listing details. Next, admin approval turns the listing live in the public marketplace."}
        </p>
        <div className="hero-actions">
          {isBookingCheckout ? (
            <Link href={`/bookings${bookingIds[0] ? `?booking_id=${bookingIds[0]}` : ""}`}>
              Manage Booking
            </Link>
          ) : business?.owner_access_token ? (
            <Link href={`/business/access/${business.owner_access_token}`}>
              Open Dashboard
            </Link>
          ) : (
            <Link href="/business">Open Dashboard</Link>
          )}
          {isBookingCheckout ? (
            <Link href="/planner">Plan More Stops</Link>
          ) : business ? (
            <Link href={`/business/${business.slug}`}>View Public Listing</Link>
          ) : (
            <Link href="/partner">Review Partner Tiers</Link>
          )}
        </div>
      </section>

      {!isBookingCheckout ? (
        <section className="success-shell">
          <article className="success-card">
            <p className="eyebrow">Selected tier</p>
            <h2>{selectedTier.name}</h2>
            <strong>{isFreeTier ? selectedTier.price : `${selectedTier.price}/mo`}</strong>
            <p>{selectedTier.description}</p>
          </article>

          <article className="success-card">
            <p className="eyebrow">Listing</p>
            <h2>{business?.name || "Business listing"}</h2>
            <p>
              {business
                ? `${business.location} • ${business.category}`
                : "Your business details were submitted during checkout."}
            </p>
            <span>{business?.is_approved ? "Approved" : "Pending admin approval"}</span>
          </article>

          <article className="success-card next-steps-card">
            <p className="eyebrow">Next steps</p>
            <ol>
              <li>Review or polish the listing in the business dashboard.</li>
              <li>Add a rider deal or coupon if one is ready.</li>
              <li>Admin approves the listing for marketplace placement.</li>
            </ol>
          </article>
        </section>
      ) : null}
    </main>
  );
}
