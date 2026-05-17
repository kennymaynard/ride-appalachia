"use client";

import { FormEvent, useMemo, useState } from "react";
import { createBusiness, createCheckout } from "../../../lib/api";
import { partnerTiers } from "../../../lib/sample-data";
import type { BusinessCreateInput, Category, Tier } from "../../../lib/types";

const categoryPhotos: Record<Exclude<Category, "deals">, string> = {
  lodging:
    "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1200&q=80",
  food: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
  rentals:
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
  repairs:
    "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1200&q=80",
  fuel: "https://images.unsplash.com/photo-1541410965313-d53b3c16ef17?auto=format&fit=crop&w=1200&q=80",
};

const initialForm = {
  name: "",
  owner_email: "",
  category: "lodging" as Exclude<Category, "deals">,
  phone: "",
  location: "",
  website_url: "",
  description: "",
};

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${slug || "business"}-${Date.now().toString(36)}`;
}

export default function JoinPage() {
  const [tier, setTier] = useState<Tier["id"]>("local_business");
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedTier = useMemo(
    () => partnerTiers.find((item) => item.id === tier) || partnerTiers[0],
    [tier],
  );

  function updateForm(
    field: keyof typeof initialForm,
    value: string,
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitJoinForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const payload: BusinessCreateInput = {
      name: form.name.trim(),
      slug: slugify(form.name),
      category: form.category,
      description: form.description.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      photo_url: categoryPhotos[form.category],
      website_url: form.website_url.trim(),
      subscription_tier: tier,
      owner_email: form.owner_email.trim(),
    };

    try {
      const business = await createBusiness(payload);
      const checkoutUrl = await createCheckout(tier, business.id);
      window.location.href = checkoutUrl;
    } catch (caughtError) {
      setIsSubmitting(false);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to submit your listing. Please try again.",
      );
    }
  }

  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Founding partner signup</p>
        <h1>Get found by riders before they hit the road.</h1>
        <p>
          Reach ATV and UTV groups planning trips near Rush, Inez, Hatfield,
          Matewan, Harlan, Black Mountain, and Royal Blue. Add your listing,
          post specials, and sponsor the ride areas your customers search.
        </p>
      </section>

      <section className="tier-grid selectable-tiers" aria-label="Founding partner tiers">
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
      </section>

      <section className="join-form-shell">
        <form className="dashboard-card" onSubmit={submitJoinForm}>
          <div>
            <p className="eyebrow">Selected plan</p>
            <h2>{selectedTier.name}</h2>
          </div>

          <label>
            Business name
            <input
              placeholder="Your business name"
              required
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
            />
          </label>
          <label>
            Owner email
            <input
              placeholder="you@yourbusiness.com"
              required
              type="email"
              value={form.owner_email}
              onChange={(event) => updateForm("owner_email", event.target.value)}
            />
          </label>
          <label>
            Category
            <select
              required
              value={form.category}
              onChange={(event) =>
                updateForm("category", event.target.value as Exclude<Category, "deals">)
              }
            >
              <option value="lodging">Lodging</option>
              <option value="food">Food</option>
              <option value="rentals">Rentals</option>
              <option value="repairs">Repairs</option>
              <option value="fuel">Fuel</option>
            </select>
          </label>
          <label>
            Phone
            <input
              placeholder="(606) 555-0142"
              required
              value={form.phone}
              onChange={(event) => updateForm("phone", event.target.value)}
            />
          </label>
          <label>
            Location
            <input
              placeholder="Hatfield, KY"
              required
              value={form.location}
              onChange={(event) => updateForm("location", event.target.value)}
            />
          </label>
          <label>
            Website or booking link
            <input
              placeholder="https://yourbusiness.com"
              type="url"
              value={form.website_url}
              onChange={(event) => updateForm("website_url", event.target.value)}
            />
          </label>
          <p className="field-help">
            Claims and new listings are reviewed before public approval. We use
            a category photo first, then you can add a direct image URL from the
            business dashboard.
          </p>
          <label>
            Description
            <textarea
              placeholder="Tell riders what makes you trail-friendly: trailer parking, early hours, group meals, fuel, repairs, rentals, or lodging details."
              required
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating Listing..." : "Submit And Continue To Checkout"}
          </button>
        </form>
      </section>
    </main>
  );
}
