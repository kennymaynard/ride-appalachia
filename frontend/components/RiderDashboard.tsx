"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  getRiderRideCard,
  requestVeteranVerification,
  saveRiderProgress,
  updateRiderAlerts,
} from "../lib/api";
import type { Rider, RiderActivity, RiderRideCard } from "../lib/types";

type Props = {
  accessToken: string;
};

const activityOptions: { label: string; value: RiderActivity }[] = [
  { label: "OHV / Ride", value: "ohv" },
  { label: "Hiking", value: "hiking" },
  { label: "Run", value: "run" },
  { label: "Walk", value: "walk" },
];

export function RiderDashboard({ accessToken }: Props) {
  const [rideCard, setRideCard] = useState<RiderRideCard | null>(null);
  const [trailName, setTrailName] = useState("");
  const [areaSlug, setAreaSlug] = useState("");
  const [activity, setActivity] = useState<RiderActivity>("ohv");
  const [isGroupRide, setIsGroupRide] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneOptIn, setPhoneOptIn] = useState(false);
  const [stormAlerts, setStormAlerts] = useState(true);
  const [trailAlerts, setTrailAlerts] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const rider = rideCard?.rider;
  const completedProgress = useMemo(
    () => rider?.progress.filter((item) => item.status === "completed") || [],
    [rider],
  );

  async function refreshRideCard() {
    const nextRideCard = await getRiderRideCard(accessToken);
    setRideCard(nextRideCard);
    if (nextRideCard?.rider) {
      setPhone(nextRideCard.rider.phone || "");
      setPhoneOptIn(nextRideCard.rider.alert_phone_opt_in);
      setStormAlerts(nextRideCard.rider.storm_alerts_enabled);
      setTrailAlerts(nextRideCard.rider.trail_alerts_enabled);
    }
  }

  useEffect(() => {
    refreshRideCard();
  }, [accessToken]);

  async function submitProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);
    try {
      await saveRiderProgress(
        {
          area_slug: areaSlug.trim() || "appalachia",
          trail_name: trailName.trim(),
          activity,
          status: "completed",
          source: "manual",
          is_group_ride: isGroupRide,
        },
        accessToken,
      );
      setTrailName("");
      setAreaSlug("");
      setIsGroupRide(false);
      await refreshRideCard();
      setMessage("Trail saved and badges checked.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save trail.");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);
    try {
      await requestVeteranVerification(
        { document_name: documentName, notes: verificationNotes },
        accessToken,
      );
      await refreshRideCard();
      setMessage("Verification request saved for review.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to request verification.");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitAlerts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);
    try {
      await updateRiderAlerts(
        {
          phone,
          alert_phone_opt_in: phoneOptIn,
          storm_alerts_enabled: stormAlerts,
          trail_alerts_enabled: trailAlerts,
        },
        accessToken,
      );
      await refreshRideCard();
      setMessage("Alert preferences saved.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save alerts.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!rideCard || !rider) {
    return (
      <section className="dashboard-card">
        <p>Loading rider profile...</p>
      </section>
    );
  }

  return (
    <section className="rider-dashboard">
      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}

      <div className="rider-stat-grid">
        <StatCard label="Trails Finished" value={rideCard.completed_trails} />
        <StatCard label="Hikes" value={rideCard.completed_hikes} />
        <StatCard label="Runs" value={rideCard.completed_runs} />
        <StatCard label="Walks" value={rideCard.completed_walks} />
        <StatCard label="Partner Visits" value={rideCard.partner_visits} />
      </div>

      <div className="rider-dashboard-grid">
        <article className="dashboard-card">
          <p className="eyebrow">Ride card</p>
          <h2>{rider.display_name}</h2>
          <p>
            Veteran verification: <strong>{rider.veteran_verification_status}</strong>
          </p>
          <div className="rider-badge-grid">
            {rideCard.badges.length ? (
              rideCard.badges.map((badge) => (
                <span key={badge.id}>{badge.label}</span>
              ))
            ) : (
              <span>Finish your first trail to earn a badge.</span>
            )}
          </div>
        </article>

        <form className="dashboard-card" onSubmit={submitProgress}>
          <p className="eyebrow">Track me finish</p>
          <h2>Mark a trail complete</h2>
          <label>
            Trail name
            <input
              required
              value={trailName}
              onChange={(event) => setTrailName(event.target.value)}
              placeholder="Van Lear / Wolf Creek"
            />
          </label>
          <label>
            Area
            <input
              value={areaSlug}
              onChange={(event) => setAreaSlug(event.target.value)}
              placeholder="rush, harlan, van-lear"
            />
          </label>
          <label>
            Activity
            <select value={activity} onChange={(event) => setActivity(event.target.value as RiderActivity)}>
              {activityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isGroupRide}
              onChange={(event) => setIsGroupRide(event.target.checked)}
            />
            Group ride
          </label>
          <button type="submit" disabled={isSaving}>
            Save Finish
          </button>
        </form>

        <form className="dashboard-card" onSubmit={submitVerification}>
          <p className="eyebrow">Hero discounts</p>
          <h2>Verify veteran status</h2>
          <label>
            Document name
            <input
              value={documentName}
              onChange={(event) => setDocumentName(event.target.value)}
              placeholder="VA card, license veteran marker"
            />
          </label>
          <label>
            Notes
            <textarea
              value={verificationNotes}
              onChange={(event) => setVerificationNotes(event.target.value)}
              placeholder="Tell us what you are sending for review."
            />
          </label>
          <button type="submit" disabled={isSaving}>
            Request Verification
          </button>
        </form>

        <form className="dashboard-card" onSubmit={submitAlerts}>
          <p className="eyebrow">Alerts</p>
          <h2>Storm and trail alerts</h2>
          <label>
            Cell phone
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="606-000-0000"
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={phoneOptIn}
              onChange={(event) => setPhoneOptIn(event.target.checked)}
            />
            Text me alerts
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={stormAlerts}
              onChange={(event) => setStormAlerts(event.target.checked)}
            />
            Storm alerts
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={trailAlerts}
              onChange={(event) => setTrailAlerts(event.target.checked)}
            />
            Trail alerts
          </label>
          <button type="submit" disabled={isSaving}>
            Save Alerts
          </button>
        </form>
      </div>

      <article className="dashboard-card">
        <p className="eyebrow">Finished trails</p>
        <div className="rider-progress-list">
          {completedProgress.length ? (
            completedProgress.map((item) => (
              <div key={item.id}>
                <strong>{item.trail_name}</strong>
                <span>
                  {item.activity.toUpperCase()} • {item.area_slug}
                </span>
              </div>
            ))
          ) : (
            <p>No finished trails saved yet.</p>
          )}
        </div>
      </article>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}
