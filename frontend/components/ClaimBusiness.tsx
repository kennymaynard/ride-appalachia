"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createCheckout, updateBusiness } from "../lib/api";
import { partnerTiers } from "../lib/sample-data";
import type { Business, Tier } from "../lib/types";

type Props = {
  business: Business;
};

export function ClaimBusiness({ business }: Props) {
  const [tier, setTier] = useState<Tier["id"]>(
    business.subscription_tier as Tier["id"],
  );
  const [ownerEmail, setOwnerEmail] = useState(business.owner_email);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedTier = useMemo(
    () => partnerTiers.find((item) => item.id === tier) || partnerTiers[0],
    [tier],
  );

  async function claimBusiness() {
    setError("");
    setIsSubmitting(true);

    try {
      await updateBusiness(business.id, {
        owner_email: ownerEmail.trim().toLowerCase(),
        subscription_tier: tier,
      });
      const checkoutUrl = await createCheckout(tier, business.id);
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
                <span>/mo</span>
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
        {error ? <p className="form-error">{error}</p> : null}
        <button
          type="button"
          disabled={isSubmitting || !ownerEmail.trim()}
          onClick={claimBusiness}
        >
          {isSubmitting ? "Starting Checkout..." : "Claim And Continue To Checkout"}
        </button>
        <Link href={`/business/${business.slug}`}>Back to listing</Link>
      </div>
    </section>
  );
}
