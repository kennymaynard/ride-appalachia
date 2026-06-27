"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { claimBusiness as submitBusinessClaim, createCheckout } from "../lib/api";
import { partnerTiers } from "../lib/sample-data";
import type { Business, Tier } from "../lib/types";

type Props = {
  business: Business;
};

export function ClaimBusiness({ business }: Props) {
  const [tier, setTier] = useState<Tier["id"]>(
    partnerTiers.some((item) => item.id === business.subscription_tier)
      ? (business.subscription_tier as Tier["id"])
      : partnerTiers[0].id,
  );
  const [ownerEmail, setOwnerEmail] = useState(business.owner_email || "");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedTier = useMemo(
    () => partnerTiers.find((item) => item.id === tier) || partnerTiers[0],
    [tier],
  );
  const isFreeTier = tier === "veteran_owned";

  async function claimBusiness() {
    setError("");
    setIsSubmitting(true);

    try {
      const claimedBusiness = await submitBusinessClaim(business.id, {
        owner_email: ownerEmail.trim().toLowerCase(),
        phone_last4: phoneLast4,
        subscription_tier: tier,
      });
      const checkoutUrl = await createCheckout(
        tier,
        claimedBusiness.id,
        claimedBusiness.owner_access_token,
      );
      window.location.href = checkoutUrl;
    } catch (caughtError) {
      setIsSubmitting(false);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to start checkout.",
      );
    }
  }

  return (
    <section className="claim-shell">
      <article className="claim-summary">
        <div>
          <p className="eyebrow">Claim listing</p>
          <h2>{business.name}</h2>
          <p>{business.description}</p>
        </div>
        <dl>
          <div>
            <dt>Phone</dt>
            <dd>{business.phone}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{business.location}</dd>
          </div>
          <div>
            <dt>Current status</dt>
            <dd>{business.is_approved ? "Approved" : "Pending"}</dd>
          </div>
        </dl>
      </article>

      <div className="tier-grid selectable-tiers">
        {partnerTiers.map((item) => (
          <button
            className={item.id === tier ? "tier-card is-selected" : "tier-card"}
            key={item.id}
            type="button"
            onClick={() => setTier(item.id)}
          >
            <div>
              <p>{item.name}</p>
              <h3>
                {item.price}
                {item.id === "veteran_owned" ? null : <span>/mo</span>}
              </h3>
              <strong>{item.description}</strong>
            </div>
            <ul>
              {item.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <span>{item.id === tier ? "Selected" : "Choose"}</span>
          </button>
        ))}
      </div>

      <div className="claim-actions">
        <div>
          <p className="eyebrow">Selected plan</p>
          <h2>{selectedTier.name}</h2>
        </div>
        <label>
          Owner email
          <input
            required
            type="email"
            value={ownerEmail}
            onChange={(event) => setOwnerEmail(event.target.value)}
            placeholder="you@yourbusiness.com"
          />
        </label>
        <label>
          Business phone last 4
          <input
            inputMode="numeric"
            maxLength={4}
            minLength={4}
            pattern="[0-9]{4}"
            required
            value={phoneLast4}
            onChange={(event) =>
              setPhoneLast4(event.target.value.replace(/\D/g, "").slice(0, 4))
            }
            placeholder="0142"
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button
          type="button"
          disabled={isSubmitting || !ownerEmail.trim() || phoneLast4.length !== 4}
          onClick={claimBusiness}
        >
          {isSubmitting
            ? isFreeTier
              ? "Submitting..."
              : "Starting Checkout..."
            : isFreeTier
              ? "Claim Free Veteran Listing"
              : "Claim And Continue To Checkout"}
        </button>
        <Link href={`/business/${business.slug}`}>Back to listing</Link>
      </div>
    </section>
  );
}
