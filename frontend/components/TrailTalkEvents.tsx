"use client";

import { FormEvent, useMemo, useState } from "react";
import { getEventPlanner, getEvents, submitEvent } from "../lib/api";
import type { EventPlannerResult, RideEvent } from "../lib/types";

const states = ["", "KY", "WV", "VA", "TN", "NC"];
const radii = [10, 25, 50, 100];
const vehicleOptions = ["ATV", "UTV", "SxS", "Jeep", "Dirt bike", "4x4"];
const emptySubmission = {
  title: "", organizer: "", description: "", state: "KY" as RideEvent["state"], city: "", venue: "", address: "",
  latitude: null, longitude: null, start_date: "", end_date: "", category: "group_ride", vehicle_types: [] as string[],
  official_url: "", registration_url: "", facebook_url: "", image_url: "", submitted_by_name: "", submitted_by_email: "",
};

function eventDate(event: RideEvent) {
  const start = new Date(`${event.start_date}T12:00:00`);
  const end = new Date(`${event.end_date}T12:00:00`);
  return event.start_date === event.end_date
    ? start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}–${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function thisWeekend(event: RideEvent) {
  const now = new Date();
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7));
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);
  return new Date(`${event.start_date}T00:00:00`) <= sunday && new Date(`${event.end_date}T23:59:59`) >= saturday;
}

export function TrailTalkEvents({ initialEvents }: { initialEvents: RideEvent[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [filters, setFilters] = useState({ state: "", month: "", category: "", vehicle: "", search: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);
  const [submission, setSubmission] = useState(emptySubmission);
  const [notice, setNotice] = useState("");
  const [planner, setPlanner] = useState<EventPlannerResult>();
  const [radius, setRadius] = useState(25);

  const featured = useMemo(() => events.filter((event) => event.is_featured), [events]);
  const weekend = useMemo(() => events.filter(thisWeekend), [events]);

  async function applyFilters(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try { setEvents(await getEvents(filters)); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load events"); }
    finally { setLoading(false); }
  }

  async function sendSubmission(event: FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    try {
      await submitEvent({ ...submission, end_date: submission.end_date || submission.start_date });
      setSubmission(emptySubmission);
      setNotice("Thanks. This ride was sent for review and will not appear publicly until verified and approved.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to submit ride"); }
  }

  async function planRide(event: RideEvent, nextRadius = radius) {
    setLoading(true); setError("");
    try { setPlanner(await getEventPlanner(event.slug, nextRadius)); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to plan ride"); }
    finally { setLoading(false); }
  }

  function cards(items: RideEvent[]) {
    return items.map((event) => (
      <article className={event.is_featured ? "trail-talk-event is-featured" : "trail-talk-event"} key={event.id}>
        <div className="listing-meta">
          {event.is_featured ? <span>Featured</span> : null}
          {event.is_verified ? <span>Verified</span> : null}
          <span>{event.category.replaceAll("_", " ")}</span>
        </div>
        <h3>{event.title}</h3><strong>{eventDate(event)}</strong>
        <p>{event.venue ? `${event.venue} • ` : ""}{event.city}, {event.state}</p>
        <p>{event.description}</p><p>Organizer: {event.organizer || "Not listed"}</p>
        {event.vehicle_types.length ? <p>Vehicles: {event.vehicle_types.join(", ")}</p> : null}
        <div className="hero-actions">
          {event.official_url ? <a href={event.official_url} target="_blank" rel="noreferrer">Official event</a> : null}
          {event.registration_url ? <a href={event.registration_url} target="_blank" rel="noreferrer">Register</a> : null}
          <button type="button" onClick={() => planRide(event)}>Plan This Ride</button>
        </div>
      </article>
    ));
  }

  return (
    <section className="trail-talk-events" aria-label="Events and rides">
      <div className="section-heading"><p>Events and rides</p><h2>Verified rides worth planning around.</h2></div>
      <form className="event-filter-grid" onSubmit={applyFilters}>
        <select aria-label="State" value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value })}>{states.map((state) => <option value={state} key={state || "all"}>{state || "All states"}</option>)}</select>
        <input aria-label="Month" type="month" value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })} />
        <input aria-label="Category" placeholder="Category" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} />
        <select aria-label="Vehicle" value={filters.vehicle} onChange={(e) => setFilters({ ...filters, vehicle: e.target.value })}><option value="">All vehicles</option>{vehicleOptions.map((vehicle) => <option key={vehicle}>{vehicle}</option>)}</select>
        <input aria-label="Search events" placeholder="Search rides, organizer, city…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <button type="submit">{loading ? "Loading…" : "Find Events"}</button>
        <button type="button" onClick={() => setShowSubmit((value) => !value)}>Submit a Ride</button>
      </form>
      {error ? <p className="form-error">{error}</p> : null}{notice ? <p className="form-success">{notice}</p> : null}
      {showSubmit ? (
        <form className="event-submission-grid dashboard-card" onSubmit={sendSubmission}>
          <h3>Submit a ride for verification</h3>
          <input required placeholder="Event name" value={submission.title} onChange={(e) => setSubmission({ ...submission, title: e.target.value })} />
          <input required placeholder="Organizer" value={submission.organizer} onChange={(e) => setSubmission({ ...submission, organizer: e.target.value })} />
          <input required type="date" value={submission.start_date} onChange={(e) => setSubmission({ ...submission, start_date: e.target.value })} />
          <input type="date" value={submission.end_date} onChange={(e) => setSubmission({ ...submission, end_date: e.target.value })} />
          <select value={submission.state} onChange={(e) => setSubmission({ ...submission, state: e.target.value as RideEvent["state"] })}>{states.filter(Boolean).map((state) => <option key={state}>{state}</option>)}</select>
          <input required placeholder="City" value={submission.city} onChange={(e) => setSubmission({ ...submission, city: e.target.value })} />
          <input placeholder="Venue" value={submission.venue} onChange={(e) => setSubmission({ ...submission, venue: e.target.value })} />
          <input placeholder="Vehicle types, comma separated" onChange={(e) => setSubmission({ ...submission, vehicle_types: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} />
          <textarea required placeholder="Ride description" value={submission.description} onChange={(e) => setSubmission({ ...submission, description: e.target.value })} />
          <input placeholder="Official link" value={submission.official_url} onChange={(e) => setSubmission({ ...submission, official_url: e.target.value })} />
          <input placeholder="Registration link" value={submission.registration_url} onChange={(e) => setSubmission({ ...submission, registration_url: e.target.value })} />
          <input placeholder="Facebook link" value={submission.facebook_url} onChange={(e) => setSubmission({ ...submission, facebook_url: e.target.value })} />
          <input required placeholder="Your name" value={submission.submitted_by_name} onChange={(e) => setSubmission({ ...submission, submitted_by_name: e.target.value })} />
          <input required type="email" placeholder="Your email" value={submission.submitted_by_email} onChange={(e) => setSubmission({ ...submission, submitted_by_email: e.target.value })} />
          <button type="submit">Send for review</button>
        </form>
      ) : null}
      {featured.length ? <><h3>Featured Events</h3><div className="trail-talk-event-grid">{cards(featured)}</div></> : null}
      {weekend.length ? <><h3>This Weekend</h3><div className="trail-talk-event-grid">{cards(weekend)}</div></> : null}
      <h3>Upcoming Events</h3><div className="trail-talk-event-grid">{events.length ? cards(events) : <p className="empty-state">No approved verified events match these filters yet.</p>}</div>
      {planner ? (
        <div className="event-planner-panel dashboard-card">
          <div><h3>Plan: {planner.event.title}</h3><select value={radius} onChange={(e) => { const next = Number(e.target.value); setRadius(next); planRide(planner.event, next); }}>{radii.map((item) => <option value={item} key={item}>{item} miles</option>)}</select></div>
          {planner.businesses.length ? planner.businesses.map((business) => <article key={business.id}><strong>{business.name}</strong>{business.is_sponsored ? <span>Sponsored / Featured</span> : null}<p>{business.category} • {business.distance_miles} miles</p><a href={`/business/${business.slug}`}>View listing</a> <a href={`https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`} target="_blank" rel="noreferrer">Directions</a>{business.website_url ? <> <a href={business.website_url} target="_blank" rel="noreferrer">Website</a></> : null}</article>) : <p className="empty-state">No approved businesses with coordinates are inside this radius.</p>}
        </div>
      ) : null}
    </section>
  );
}
