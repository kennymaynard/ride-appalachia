"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  getRiderRideCard,
  getSavedRideEvents,
  requestVeteranVerification,
  saveRiderProgress,
  updateRiderAlerts,
} from "../lib/api";
import type { RideEvent, Rider, RiderActivity, RiderRideCard } from "../lib/types";

type Props = {
  accessToken: string;
};

type Achievement = {
  badgeKey: string;
  label: string;
  category: string;
  current: number;
  target: number;
};

const trailBadgeMilestones = [1, 5, 10, 25, 50, 100];
const activityBadgeMilestones = [1, 5, 10, 25];
const partnerBadgeMilestones = [1, 5, 10, 25];

const activityOptions: { label: string; value: RiderActivity }[] = [
  { label: "OHV / Ride", value: "ohv" },
  { label: "Hiking", value: "hiking" },
  { label: "Run", value: "run" },
  { label: "Walk", value: "walk" },
];

function buildAchievements(rideCard: RiderRideCard, groupRides: number): Achievement[] {
  const activityCounts = {
    hiking: rideCard.completed_hikes,
    run: rideCard.completed_runs,
    walk: rideCard.completed_walks,
  };
  const activityLabels = {
    hiking: "Hike",
    run: "Run",
    walk: "Walk",
  };

  return [
    ...trailBadgeMilestones.map((target) => ({
      badgeKey: `trail_${target}`,
      label: `${target} Trail Finisher`,
      category: "trail",
      current: rideCard.completed_trails,
      target,
    })),
    ...(["hiking", "run", "walk"] as const).flatMap((activity) =>
      activityBadgeMilestones.map((target) => ({
        badgeKey: `${activity}_${target}`,
        label: `${target} ${activityLabels[activity]} Badge`,
        category: activity,
        current: activityCounts[activity],
        target,
      })),
    ),
    {
      badgeKey: "group_ride_1",
      label: "Group Ride Starter",
      category: "community",
      current: groupRides,
      target: 1,
    },
    {
      badgeKey: "group_ride_5",
      label: "Group Ride Regular",
      category: "community",
      current: groupRides,
      target: 5,
    },
    ...partnerBadgeMilestones.map((target) => ({
      badgeKey: `partner_visit_${target}`,
      label: `${target} Partner Visit Badge`,
      category: "partner",
      current: rideCard.partner_visits,
      target,
    })),
  ];
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    trail: "Trail",
    hiking: "Hike",
    run: "Run",
    walk: "Walk",
    community: "Group",
    partner: "Partner",
  };
  return labels[category] || category;
}

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
  const [trackedTrailKey, setTrackedTrailKey] = useState("");
  const [savedEvents, setSavedEvents] = useState<RideEvent[]>([]);

  const rider = rideCard?.rider;
  const currentTrailKey = `${(areaSlug.trim() || "appalachia").toLowerCase()}::${trailName.trim().toLowerCase()}`;
  const isTrackingCurrentTrail = Boolean(trailName.trim()) && trackedTrailKey === currentTrailKey;
  const completedProgress = useMemo(
    () => rider?.progress.filter((item) => item.status === "completed") || [],
    [rider],
  );
  const groupRideCount = useMemo(
    () => completedProgress.filter((item) => item.is_group_ride).length,
    [completedProgress],
  );
  const achievements = useMemo(
    () => (rideCard ? buildAchievements(rideCard, groupRideCount) : []),
    [rideCard, groupRideCount],
  );
  const earnedBadgeKeys = useMemo(
    () => new Set(rideCard?.badges.map((badge) => badge.badge_key) || []),
    [rideCard],
  );
  const lockedAchievements = achievements.filter(
    (achievement) => !earnedBadgeKeys.has(achievement.badgeKey),
  );
  const nextAchievements = lockedAchievements
    .filter((achievement) => achievement.current < achievement.target)
    .sort((a, b) => a.target - a.current - (b.target - b.current))
    .slice(0, 4);
  const earnedBadgeLookup = new Map(rideCard?.badges.map((badge) => [badge.badge_key, badge]));

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
    getSavedRideEvents(accessToken).then(setSavedEvents).catch(() => setSavedEvents([]));
  }, [accessToken]);

  async function checkInAndTrack() {
    setError("");
    setMessage("");
    if (!trailName.trim()) {
      setError("Enter a trail name before checking in.");
      return;
    }
    setIsSaving(true);
    try {
      await saveRiderProgress(
        {
          area_slug: areaSlug.trim() || "appalachia",
          trail_name: trailName.trim(),
          activity,
          status: "saved",
          source: "checked_in",
          is_group_ride: isGroupRide,
        },
        accessToken,
      );
      setTrackedTrailKey(currentTrailKey);
      await refreshRideCard();
      setMessage("Checked in. Tracking is on for this trail.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to check in.");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!isTrackingCurrentTrail) {
      setError("Check in and start tracking this trail before marking it complete.");
      return;
    }
    setIsSaving(true);
    try {
      await saveRiderProgress(
        {
          area_slug: areaSlug.trim() || "appalachia",
          trail_name: trailName.trim(),
          activity,
          status: "completed",
          source: "tracked",
          is_group_ride: isGroupRide,
        },
        accessToken,
      );
      setTrailName("");
      setAreaSlug("");
      setIsGroupRide(false);
      setTrackedTrailKey("");
      await refreshRideCard();
      setMessage("Tracked trail completed and badges checked.");
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

      <article className="dashboard-card"><p className="eyebrow">Saved events</p><h2>Your upcoming rides</h2>{savedEvents.length ? savedEvents.map((event) => <p key={event.id}><a href={`/trail-talk/rides/${event.slug}`}>{event.title}</a> • {event.start_date}</p>) : <p className="empty-state">No saved events yet.</p>}</article>

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
          <div className="rider-achievement-summary">
            <strong>{rideCard.badges.length}</strong>
            <span>badges earned</span>
          </div>
          <div className="rider-badge-grid">
            {achievements
              .filter((achievement) => earnedBadgeKeys.has(achievement.badgeKey))
              .map((achievement) => (
                <BadgeCard
                  achievement={achievement}
                  earnedAt={earnedBadgeLookup.get(achievement.badgeKey)?.earned_at}
                  isEarned
                  key={achievement.badgeKey}
                />
              ))}
            {!rideCard.badges.length ? (
              <p className="field-help">Finish your first trail to unlock the first badge.</p>
            ) : null}
          </div>
        </article>

        <article className="dashboard-card">
          <p className="eyebrow">Next badges</p>
          <h2>Keep riding</h2>
          <div className="rider-next-badge-list">
            {nextAchievements.length ? (
              nextAchievements.map((achievement) => (
                <BadgeCard
                  achievement={achievement}
                  isEarned={false}
                  key={achievement.badgeKey}
                />
              ))
            ) : (
              <p>All current badges are unlocked.</p>
            )}
          </div>
        </article>

        <form className="dashboard-card" onSubmit={submitProgress}>
          <p className="eyebrow">Check in first</p>
          <h2>Track a trail before completion</h2>
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
          <button type="button" disabled={isSaving || !trailName.trim()} onClick={checkInAndTrack}>
            {isTrackingCurrentTrail ? "Tracking On" : "Check In & Start Tracking"}
          </button>
          <button type="submit" disabled={isSaving || !isTrackingCurrentTrail}>
            Complete Tracked Trail
          </button>
          <p className="field-help">
            Badges unlock only after the trail has been checked in and tracked.
          </p>
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

function BadgeCard({
  achievement,
  earnedAt,
  isEarned,
}: {
  achievement: Achievement;
  earnedAt?: string;
  isEarned: boolean;
}) {
  const progress = Math.min(100, Math.round((achievement.current / achievement.target) * 100));
  const remaining = Math.max(achievement.target - achievement.current, 0);

  return (
    <article className={`rider-badge-card ${isEarned ? "is-earned" : "is-locked"}`}>
      <div>
        <strong>{getCategoryLabel(achievement.category).slice(0, 2).toUpperCase()}</strong>
        <span>{isEarned ? "Unlocked" : `${remaining} to go`}</span>
      </div>
      <h3>{achievement.label}</h3>
      <div className="rider-badge-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <p>
        {isEarned
          ? earnedAt
            ? `Earned ${new Date(earnedAt).toLocaleDateString()}`
            : "Earned"
          : `${achievement.current} of ${achievement.target} complete`}
      </p>
    </article>
  );
}
