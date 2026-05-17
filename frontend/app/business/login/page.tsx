"use client";

import { FormEvent, useState } from "react";
import { loginBusiness } from "../../../lib/api";

export default function BusinessLoginPage() {
  const [ownerEmail, setOwnerEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const loginResult = await loginBusiness(ownerEmail.trim().toLowerCase());
      if (loginResult.access_url) {
        window.location.href = loginResult.access_url;
        return;
      }
      setSuccessMessage(loginResult.message);
      setIsSubmitting(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to find your business.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Business login</p>
        <h1>Open your business portal.</h1>
        <p>
          Enter the owner email used when the business joined. We will send the
          private portal link to that inbox.
        </p>
      </section>

      <section className="join-form-shell">
        <form className="dashboard-card" onSubmit={submitLogin}>
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
          {successMessage ? <p className="form-success">{successMessage}</p> : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending Link..." : "Send Business Portal Link"}
          </button>
        </form>
      </section>
    </main>
  );
}
