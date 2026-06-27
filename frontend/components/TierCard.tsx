"use client";

import type { Tier } from "../lib/types";

type Props = {
  tier: Tier;
};

export function TierCard({ tier }: Props) {
  const isFreeTier = tier.id === "veteran_owned";

  function startSignup() {
    window.location.href = `/business/join?tier=${tier.id}`;
  }

  return (
    <article className="tier-card">
      <div>
        <p>{tier.name}</p>
        <h3>
          {tier.price}
          {isFreeTier ? null : <span>/mo</span>}
        </h3>
        <strong>{tier.description}</strong>
      </div>
      <ul>
        {tier.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <button type="button" onClick={startSignup}>
        {isFreeTier ? "Join For Free" : "Start Signup"}
      </button>
    </article>
  );
}
