"use client";

import { useState } from "react";
import { createCheckout } from "../lib/api";
import type { Tier } from "../lib/types";

type Props = {
  tier: Tier;
};

export function TierCard({ tier }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  async function startCheckout() {
    setIsLoading(true);
    try {
      const checkoutUrl = await createCheckout(tier.id);
      window.location.href = checkoutUrl;
    } catch {
      setIsLoading(false);
      alert("Checkout is not available yet. Add Stripe keys to enable this tier.");
    }
  }

  return (
    <article className="tier-card">
      <div>
        <p>{tier.name}</p>
        <h3>
          {tier.price}
          <span>/mo</span>
        </h3>
        <strong>{tier.description}</strong>
      </div>
      <ul>
        {tier.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <button type="button" onClick={startCheckout} disabled={isLoading}>
        {isLoading ? "Opening..." : "Choose Plan"}
      </button>
    </article>
  );
}
