"use client";

import { FormEvent, useState } from "react";
import { createMarketingLead } from "../lib/api";

export function BusinessLeadForm() {
  const [status, setStatus] = useState<"idle" | "saving" | "sent">("idle");
  const [error, setError] = useState("");

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("saving");
    const form = new FormData(event.currentTarget);

    try {
      await createMarketingLead({
        lead_type: "business_availability",
        email: String(form.get("email") || ""),
        business_name: String(form.get("business_name") || ""),
        category: String(form.get("category") || ""),
        area: String(form.get("area") || ""),
        phone: String(form.get("phone") || ""),
        website: String(form.get("website") || ""),
        source: "business_check_availability",
        notes: "Business asked to check founding partner availability.",
      });
      event.currentTarget.reset();
      setStatus("sent");
    } catch {
      setError("Could not send this yet. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <form className="business-lead-form" onSubmit={submitLead}>
      <h3>Check Availability</h3>
      <label>
        Business name
        <input required name="business_name" placeholder="Your business" />
      </label>
      <label>
        Category
        <select required name="category" defaultValue="">
          <option value="" disabled>Choose category</option>
          <option>Lodging</option>
          <option>Food</option>
          <option>Fuel</option>
          <option>Repairs</option>
          <option>Rentals</option>
          <option>Events</option>
          <option>Deals</option>
        </select>
      </label>
      <label>
        Town or trail area served
        <input required name="area" placeholder="Rush, Harlan, Royal Blue..." />
      </label>
      <label>
        Phone
        <input required name="phone" placeholder="Best number" />
      </label>
      <label>
        Email
        <input required name="email" type="email" placeholder="you@business.com" />
      </label>
      <label>
        Website or Facebook
        <input name="website" placeholder="https://..." />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      {status === "sent" ? (
        <p className="form-success">Got it. We will confirm your area and follow up.</p>
      ) : null}
      <button type="submit" disabled={status === "saving"}>
        {status === "saving" ? "Checking..." : "Check My Area"}
      </button>
    </form>
  );
}
