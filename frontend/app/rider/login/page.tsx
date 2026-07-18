"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  confirmRiderPasswordReset,
  geocodeLocation,
  loginRider,
  requestRiderPasswordReset,
} from "../../../lib/api";

export default function RiderLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [homeLocation, setHomeLocation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savedToken, setSavedToken] = useState("");
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [showResetRequest, setShowResetRequest] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnTo, setReturnTo] = useState("");
  const [isSignup, setIsSignup] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setResetToken(params.get("reset_token") || "");
    const requestedReturn = params.get("return_to") || "";
    setReturnTo(requestedReturn.startsWith("/") && !requestedReturn.startsWith("//") ? requestedReturn : "");
    if (params.get("signup") === "1") { setShowProfileDetails(true); setIsSignup(true); }
    setSavedToken(window.localStorage.getItem("aoa_rider_token") || "");
  }, []);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      let coordinates: { latitude?: number; longitude?: number } = {};
      if (showProfileDetails && homeLocation.trim()) {
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
        display_name: showProfileDetails ? displayName.trim() : "",
        phone: showProfileDetails ? phone.trim() : "",
        home_location: showProfileDetails ? homeLocation.trim() : "",
        home_latitude: coordinates.latitude,
        home_longitude: coordinates.longitude,
      });
      window.localStorage.setItem("aoa_rider_token", loginResult.access_token);
      window.location.href = returnTo || loginResult.access_url;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to open rider profile.",
      );
      setIsSubmitting(false);
    }
  }

  async function submitResetRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);
    try {
      const result = await requestRiderPasswordReset(email.trim().toLowerCase());
      setMessage(result.reset_url ? `${result.message} ${result.reset_url}` : result.message);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to request password reset.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitResetConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);
    try {
      const resetResult = await confirmRiderPasswordReset({
        reset_token: resetToken,
        password: resetPassword.trim(),
      });
      window.localStorage.setItem("aoa_rider_token", resetResult.access_token);
      window.location.href = resetResult.access_url;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to reset rider password.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">{isSignup ? "Free rider signup" : "Rider login"}</p>
        <h1>{resetToken ? "Reset your rider password." : isSignup ? "Create your free rider account." : "Open your rider profile."}</h1>
        <p>
          {isSignup ? "A rider account is required to save plans, submit community information, or claim a listing. Public maps and browsing remain open." : "Returning riders only need email and password. Profile details stay saved to your ride card and can be updated when you want."}
        </p>
      </section>

      <section className="join-form-shell">
        {resetToken ? (
          <form className="dashboard-card" onSubmit={submitResetConfirm}>
            <label>
              New password
              <input
                autoComplete="new-password"
                minLength={4}
                placeholder="New rider password"
                required
                type="password"
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            {message ? <p className="form-success">{message}</p> : null}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        ) : showResetRequest ? (
          <form className="dashboard-card" onSubmit={submitResetRequest}>
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
            {error ? <p className="form-error">{error}</p> : null}
            {message ? <p className="form-success">{message}</p> : null}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </button>
            <button type="button" className="ghost-button" onClick={() => setShowResetRequest(false)}>
              Back to Login
            </button>
          </form>
        ) : (
          <form className="dashboard-card" onSubmit={submitLogin}>
            {savedToken ? (
              <a className="button-link secondary" href={`/rider/access/${savedToken}`}>
                Continue to Saved Profile
              </a>
            ) : null}
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
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={showProfileDetails}
                onChange={(event) => setShowProfileDetails(event.target.checked)}
              />
              Add or update rider details
            </label>
            {showProfileDetails ? (
              <>
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
              </>
            ) : null}
            <p className="field-help">
              Existing profiles without a password can use the last 4 digits of the
              saved phone number once.
            </p>
            {error ? <p className="form-error">{error}</p> : null}
            {message ? <p className="form-success">{message}</p> : null}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Opening..." : isSignup ? "Create Free Rider Account" : "Open Rider Profile"}
            </button>
            <button type="button" className="ghost-button" onClick={() => setShowResetRequest(true)}>
              Forgot Password?
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
