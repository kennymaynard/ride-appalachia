"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  photo_url: "",
};

const tierIds = partnerTiers.map((item) => item.id);

const tierBestFor: Record<Tier["id"], string> = {
  local_business: "Best for food, fuel, repair, recovery, outfitters, and local shops.",
  lodging_partner: "Best for cabins, campgrounds, hotels, and trailer-friendly stays.",
  veteran_owned: "Best for veteran-owned businesses serving riders and trail towns.",
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
  const [checkoutNotice, setCheckoutNotice] = useState("");

  const selectedTier = useMemo(
    () => partnerTiers.find((item) => item.id === tier) || partnerTiers[0],
    [tier],
  );
  const isFreeTier = tier === "veteran_owned";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTier = params.get("tier") as Tier["id"] | null;
    if (requestedTier && tierIds.includes(requestedTier)) {
      setTier(requestedTier);
    }
    if (params.get("checkout") === "cancelled") {
      setCheckoutNotice(
        "Checkout was cancelled. Your listing details are not live until the monthly plan is completed.",
      );
    }
  }, []);

  function updateForm(
    field: keyof typeof initialForm,
    value: string,
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function useUploadedPhoto(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateForm("photo_url", reader.result);
      }
    };
    reader.readAsDataURL(file);
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
      photo_url: form.photo_url || categoryPhotos[form.category],
      website_url: form.website_url.trim(),
      subscription_tier: tier,
      owner_email: form.owner_email.trim(),
    };

    try {
      const business = await createBusiness(payload);
      const checkoutUrl = await createCheckout(tier, business.id, business.owner_access_token);
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
        <p className="eyebrow">Business signup</p>
        <h1>Choose the right plan for your business.</h1>
        <p>
          Get found by ATV, UTV, Jeep, and SxS riders looking for lodging,
          food, fuel, repair, recovery, outfitter stops, and trail-town deals
          before they hit the road. Start with a $29 Local Business listing or
          choose the Lodging Partner or free Veteran Owned plan when it fits your
          business.
        </p>
        <div className="join-hero-proof" aria-label="Signup details">
          <span>Veteran Owned is $0.00</span>
          <span>Cancel anytime</span>
          <span>Reviewed before going live</span>
        </div>
      </section>

      {checkoutNotice ? <p className="form-error join-alert">{checkoutNotice}</p> : null}

      <section className="join-flow-strip" aria-label="Signup steps">
        <article>
          <span>1</span>
          <strong>Choose your monthly tier</strong>
        </article>
        <article>
          <span>2</span>
          <strong>Add your listing details</strong>
        </article>
        <article>
          <span>3</span>
          <strong>{isFreeTier ? "Submit for review" : "Continue to secure checkout"}</strong>
        </article>
      </section>

      <section className="tier-grid selectable-tiers" aria-label="Partner tiers">
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
              <small>{tierBestFor[item.id]}</small>
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
          <div className="selected-plan-summary">
            <div>
              <p className="eyebrow">Selected plan</p>
              <h2>{selectedTier.name}</h2>
            </div>
            <strong>
              {selectedTier.price}
              {isFreeTier ? null : <span>/month</span>}
            </strong>
            <p>
              {isFreeTier
                ? "Your listing is created first, then submitted for admin review as a free Veteran Owned plan."
                : "Your listing is created first, then you continue to secure Stripe checkout to activate the monthly plan."}
            </p>
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
            a category photo if you do not upload one.
          </p>
          <label>
            Listing photo
            <input
              accept="image/*"
              type="file"
              onChange={(event) => useUploadedPhoto(event.target.files?.[0])}
            />
          </label>
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
            {isSubmitting
              ? isFreeTier
                ? "Submitting..."
                : "Opening Checkout..."
              : isFreeTier
                ? "Submit Free Veteran Listing"
                : `Continue to ${selectedTier.price}/month Checkout`}
          </button>
        </form>
      </section>
    </main>
  );
}
