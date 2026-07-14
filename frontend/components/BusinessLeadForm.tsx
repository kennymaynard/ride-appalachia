"use client";

import { FormEvent, useState } from "react";
import { createMarketingLead } from "../lib/api";
import {
  formatPhoneNumber,
  isValidPhoneNumber,
  normalizeWebsiteUrl,
} from "../lib/contact-format";

export function BusinessLeadForm() {
  const [status, setStatus] = useState<"idle" | "saving" | "sent">("idle");
  const [error, setError] = useState("");

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("saving");
    const form = new FormData(event.currentTarget);
    const phone = String(form.get("phone") || "");

    if (!isValidPhoneNumber(phone)) {
      setError("Enter a 10-digit phone number so we can contact your business.");
      setStatus("idle");
      return;
    }

    try {
      await createMarketingLead({
        lead_type: "business_availability",
        email: String(form.get("email") || ""),
        business_name: String(form.get("business_name") || ""),
        category: String(form.get("category") || ""),
        area: String(form.get("area") || ""),
        phone: formatPhoneNumber(phone),
        website: normalizeWebsiteUrl(String(form.get("website") || "")),
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
      <h3>Have us contact you</h3>
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
          <option>Services</option>
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
        <input
          inputMode="tel"
          name="phone"
          pattern="1?[ .-]?[(]?[0-9]{3}[)]?[ .-]?[0-9]{3}[ .-]?[0-9]{4}"
          placeholder="(606) 555-0142"
          required
          title="Enter a 10-digit phone number."
        />
      </label>
      <label>
        Email
        <input required name="email" type="email" placeholder="you@business.com" />
      </label>
      <label>
        Website or Facebook
        <input inputMode="url" name="website" placeholder="yourbusiness.com or Facebook link" />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      {status === "sent" ? (
        <p className="form-success">Got it. Your request was sent to our team for follow-up.</p>
      ) : null}
      <button type="submit" disabled={status === "saving"}>
        {status === "saving" ? "Sending..." : "Request a Call"}
      </button>
    </form>
  );
}
