"use client";

import { useEffect, useState } from "react";
import { createEventPlan, getEventEngagement, saveRideEvent, setEventAttendance } from "../lib/api";
import type { EventEngagement, RideEvent } from "../lib/types";

export function EventEngagementPanel({ event }: { event: RideEvent }) {
  const [token, setToken] = useState("");
  const [engagement, setEngagement] = useState<EventEngagement>({ saved: false, attendance: "", going: 0, interested: 0 });
  const [notice, setNotice] = useState("");
  useEffect(() => { const value = localStorage.getItem("aoa_rider_token") || ""; setToken(value); getEventEngagement(event.slug, value).then(setEngagement).catch(() => undefined); }, [event.slug]);
  async function save() { try { const next = !engagement.saved; await saveRideEvent(event.id, token, next); setEngagement({ ...engagement, saved: next }); } catch (e) { setNotice(e instanceof Error ? e.message : "Unable to save"); } }
  async function attend(value: "going" | "interested") { try { setEngagement(await setEventAttendance(event.id, token, value)); } catch (e) { setNotice(e instanceof Error ? e.message : "Unable to update"); } }
  async function share() { const url = window.location.href; if (navigator.share) await navigator.share({ title: event.title, url }); else { await navigator.clipboard.writeText(url); setNotice("Event link copied."); } }
  async function plan() { try { const result = await createEventPlan(event.id, token, { arrival_date: event.start_date, departure_date: event.end_date, items: [{ day: 1, type: "event staging", label: event.title }], notes: "" }); setNotice(`Plan saved. Private link: ${result.share_url}`); } catch (e) { setNotice(e instanceof Error ? e.message : "Unable to save plan"); } }
  const canonical = typeof window === "undefined" ? "" : window.location.href;
  return <section className="dashboard-card" aria-label="Event actions">
    <div className="hero-actions">
      <button type="button" onClick={save}>{engagement.saved ? "Saved" : "Save Event"}</button>
      <button type="button" onClick={() => attend("going")}>I&apos;m Going ({engagement.going})</button>
      <button type="button" onClick={() => attend("interested")}>Interested ({engagement.interested})</button>
      <a href={`/api/events/${event.slug}/calendar.ics`}>Add to Calendar</a>
      <a href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${event.start_date.replaceAll("-", "")}/${event.end_date.replaceAll("-", "")}`} target="_blank" rel="noreferrer">Google Calendar</a>
      <a href={`https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(event.title)}&startdt=${event.start_date}&enddt=${event.end_date}`} target="_blank" rel="noreferrer">Outlook</a>
      <button type="button" onClick={share}>Share</button>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}`} target="_blank" rel="noreferrer">Facebook</a>
      <a href={`mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(canonical)}`}>Email</a>
      <a href={`sms:?body=${encodeURIComponent(`${event.title} ${canonical}`)}`}>Text</a>
      <button type="button" onClick={plan}>Plan This Ride</button>
    </div>
    {notice ? <p aria-live="polite">{notice}</p> : null}
  </section>;
}
