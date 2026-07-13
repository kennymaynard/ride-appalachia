"use client";

import { FormEvent, useEffect, useState } from "react";
import { createAdminEvent, downloadAdminEventFlyer, getAdminEvents, moderateAdminEvent, updateAdminEvent } from "../lib/api";
import type { RideEvent } from "../lib/types";

const blank = { title: "", organizer: "", description: "", state: "KY", city: "", venue: "", address: "", latitude: "", longitude: "", start_date: "", end_date: "", category: "group_ride", vehicle_types: [] as string[], official_url: "", registration_url: "", facebook_url: "", instagram_url: "", image_url: "", difficulty: "not_listed", family_friendly: false, estimated_attendance: "", trail_area_slug: "", verification_source: "", is_verified: false, is_featured: false, status: "pending", admin_notes: "" };

export function AdminEventsPanel({ adminPassword }: { adminPassword: string }) {
  const [events, setEvents] = useState<RideEvent[]>([]);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<number>();
  const [message, setMessage] = useState("");

  async function load(status = filter) {
    try { setEvents(await getAdminEvents(adminPassword, status)); setMessage(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load events"); }
  }
  useEffect(() => { load("all"); }, [adminPassword]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if ((form.status === "approved" || form.is_verified) && !form.verification_source) { setMessage("Add an official verification source before publishing."); return; }
    try {
      const payload = { ...form, latitude: form.latitude ? Number(form.latitude) : null, longitude: form.longitude ? Number(form.longitude) : null, estimated_attendance: form.estimated_attendance ? Number(form.estimated_attendance) : null, end_date: form.end_date || form.start_date } as unknown as Partial<RideEvent>;
      if (editingId) await updateAdminEvent(editingId, payload, adminPassword); else await createAdminEvent(payload, adminPassword);
      setForm(blank); setEditingId(undefined); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save event"); }
  }

  function edit(item: RideEvent) {
    setEditingId(item.id);
    setForm({ title: item.title, organizer: item.organizer, description: item.description, state: item.state, city: item.city, venue: item.venue, address: item.address, latitude: item.latitude == null ? "" : String(item.latitude), longitude: item.longitude == null ? "" : String(item.longitude), start_date: item.start_date, end_date: item.end_date, category: item.category, vehicle_types: item.vehicle_types, official_url: item.official_url, registration_url: item.registration_url, facebook_url: item.facebook_url, instagram_url: item.instagram_url || "", image_url: item.image_url, difficulty: item.difficulty || "not_listed", family_friendly: Boolean(item.family_friendly), estimated_attendance: item.estimated_attendance == null ? "" : String(item.estimated_attendance), trail_area_slug: item.trail_area_slug || "", verification_source: item.verification_source, is_verified: item.is_verified, is_featured: item.is_featured, status: item.status, admin_notes: item.admin_notes || "" });
  }

  async function moderate(item: RideEvent, status: string) {
    if (status === "approved" && (!item.is_verified || !item.verification_source)) { setMessage("Edit and verify this event from an official source before approval."); return; }
    try { await moderateAdminEvent(item.id, { status, is_verified: item.is_verified, is_featured: item.is_featured, verification_source: item.verification_source }, adminPassword); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to moderate event"); }
  }

  return <section className="admin-event-panel">
    <div className="section-heading"><p>Event moderation</p><h2>Verified ride calendar</h2></div>
    <form className="dashboard-card event-submission-grid" onSubmit={save}>
      <h3>{editingId ? "Edit event" : "Create event"}</h3>
      <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <input placeholder="Organizer" value={form.organizer} onChange={(e) => setForm({ ...form, organizer: e.target.value })} />
      <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>{["KY", "WV", "VA", "TN", "NC"].map((state) => <option key={state}>{state}</option>)}</select>
      <input required placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
      <input placeholder="Venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
      <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      <input inputMode="decimal" placeholder="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
      <input inputMode="decimal" placeholder="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
      <input required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
      <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
      <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
      <input placeholder="Vehicle types, comma separated" value={form.vehicle_types.join(", ")} onChange={(e) => setForm({ ...form, vehicle_types: e.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} />
      <textarea required placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <input placeholder="Official URL" value={form.official_url} onChange={(e) => setForm({ ...form, official_url: e.target.value })} />
      <input placeholder="Registration URL" value={form.registration_url} onChange={(e) => setForm({ ...form, registration_url: e.target.value })} />
      <input placeholder="Facebook URL" value={form.facebook_url} onChange={(e) => setForm({ ...form, facebook_url: e.target.value })} />
      <input placeholder="Instagram URL" value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} />
      <input placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
      <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>{["not_listed","easy","moderate","difficult","extreme"].map((value) => <option key={value}>{value.replaceAll("_", " ")}</option>)}</select>
      <label><input type="checkbox" checked={form.family_friendly} onChange={(e) => setForm({ ...form, family_friendly: e.target.checked })}/> Family friendly</label>
      <input type="number" min="0" placeholder="Estimated attendance" value={form.estimated_attendance} onChange={(e) => setForm({ ...form, estimated_attendance: e.target.value })}/>
      <input placeholder="Trail area slug for conditions" value={form.trail_area_slug} onChange={(e) => setForm({ ...form, trail_area_slug: e.target.value })}/>
      <input required={form.is_verified || form.status === "approved"} placeholder="Verification source URL" value={form.verification_source} onChange={(e) => setForm({ ...form, verification_source: e.target.value })} />
      <label><input type="checkbox" checked={form.is_verified} onChange={(e) => setForm({ ...form, is_verified: e.target.checked })} /> Verified</label>
      <label><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> Featured</label>
      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{["pending", "approved", "rejected", "expired", "unpublished"].map((status) => <option key={status}>{status}</option>)}</select>
      <textarea placeholder="Admin notes" value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} />
      <button type="submit">{editingId ? "Save event" : "Create event"}</button>{editingId ? <button type="button" onClick={() => { setEditingId(undefined); setForm(blank); }}>Cancel</button> : null}
    </form>
    {message ? <p className="form-error">{message}</p> : null}
    <div className="trail-talk-filters">{["all", "pending", "approved", "rejected", "expired", "unpublished"].map((status) => <button className={filter === status ? "is-active" : ""} key={status} type="button" onClick={() => { setFilter(status); load(status); }}>{status}</button>)}</div>
    <div className="admin-listings">{events.map((item) => <article className="dashboard-card" key={item.id}><div className="listing-meta"><span>{item.status}</span><span>{item.is_verified ? "Verified" : "Unverified"}</span>{item.is_featured ? <span>Featured</span> : null}</div><h3>{item.title}</h3><p>{item.start_date} • {item.city}, {item.state}</p>{item.verification_source ? <a href={item.verification_source} target="_blank" rel="noreferrer">Verification source</a> : <p className="form-error">Verification source required before publishing.</p>}<div className="admin-actions"><button type="button" onClick={() => edit(item)}>Edit</button><button type="button" onClick={() => moderate(item, "approved")}>Approve</button><button type="button" onClick={() => moderate(item, "rejected")}>Reject</button><button type="button" onClick={() => moderate(item, "unpublished")}>Hide</button><button type="button" onClick={() => moderate(item, "expired")}>Archive</button>{item.is_verified ? (["facebook","instagram","story","poster","pdf"] as const).map((format) => <button key={format} type="button" onClick={() => downloadAdminEventFlyer(item.id, format, adminPassword)}>{format} flyer</button>) : null}</div></article>)}</div>
  </section>;
}
