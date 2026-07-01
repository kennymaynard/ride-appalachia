"use client";

import { FormEvent, useState } from "react";
import { geocodeLocation, loginRider } from "../../../lib/api";

export default function RiderLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [homeLocation, setHomeLocation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      let coordinates: { latitude?: number; longitude?: number } = {};
      if (homeLocation.trim()) {
        try {
          const result = await geocodeLocation(homeLocation.trim());
          coordinates = {
            latitude: result.latitude,
            longitude: result.longitude,
          };
        } catch {
          coordinates = {};
        }
      }
      const loginResult = await loginRider({
        email: email.trim().toLowerCase(),
        password: password.trim(),
        display_name: displayName.trim(),
        phone: phone.trim(),
        home_location: homeLocation.trim(),
        home_latitude: coordinates.latitude,
        home_longitude: coordinates.longitude,
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
          Create or open your rider profile with your email and password so the
          app can remember completed trails, hiking badges, partner visits,
          verified discounts, and alerts.
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
            Password
            <input
              autoComplete="current-password"
              minLength={4}
              placeholder="Rider password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="606-000-0000"
            />
          </label>
          <label>
            Home town
            <input
              value={homeLocation}
              onChange={(event) => setHomeLocation(event.target.value)}
              placeholder="Pikeville, KY"
            />
          </label>
          <p className="field-help">
            Existing rider profiles without a password can use the last 4 digits
            of the profile phone number once.
          </p>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Opening..." : "Open Rider Profile"}
          </button>
        </form>
      </section>
    </main>
  );
}
