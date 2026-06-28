"use client";

import { FormEvent, useState } from "react";
import { loginRider } from "../../../lib/api";

export default function RiderLoginPage() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const loginResult = await loginRider({
        email: email.trim().toLowerCase(),
        display_name: displayName.trim(),
        phone: phone.trim(),
      });
      window.localStorage.setItem("aoa_rider_token", loginResult.access_token);
      window.location.href = loginResult.access_url;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to open rider profile.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Rider login</p>
        <h1>Save trails, earn badges, and build your ride card.</h1>
        <p>
          Create or open your rider profile so the app can remember completed
          trails, hiking badges, partner visits, verified discounts, and alerts.
        </p>
      </section>

      <section className="join-form-shell">
        <form className="dashboard-card" onSubmit={submitLogin}>
          <label>
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@email.com"
            />
          </label>
          <label>
            Rider name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Courtney"
            />
          </label>
          <label>
            Cell phone
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="606-000-0000"
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Opening..." : "Open Rider Profile"}
          </button>
        </form>
      </section>
    </main>
  );
}
