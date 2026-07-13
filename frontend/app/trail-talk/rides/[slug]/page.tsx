import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventEngagementPanel } from "../../../../components/EventEngagementPanel";
import { getEvent, getEventPlanner } from "../../../../lib/api";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const event = await getEvent(slug); return { title: event ? `${event.title} | Appalachia Offroad` : "Ride Event", description: event?.description, openGraph: event ? { title: event.title, description: event.description, images: event.image_url ? [event.image_url] : [] } : undefined }; }
export default async function EventPage({ params }: Props) {
  const { slug } = await params; const event = await getEvent(slug); if (!event) notFound();
  const planner = await getEventPlanner(slug).catch(() => null);
  return <main className="page"><section className="page-hero compact"><p className="eyebrow">Verified ride event</p><h1>{event.title}</h1><p>{event.start_date}–{event.end_date} • {event.venue ? `${event.venue} • ` : ""}{event.city}, {event.state}</p><div className="listing-meta">{event.is_verified ? <span>Verified</span> : null}<span>Checked {event.verified_at?.slice(0, 10) || "date unavailable"}</span></div></section>
    <section className="page-section"><article className="dashboard-card"><h2>Event details</h2><p>{event.description}</p><p>Organizer: {event.organizer || "Not listed"}</p><p>Vehicles: {event.vehicle_types.join(", ") || "Confirm with organizer"}</p><div className="hero-actions">{event.official_url ? <a href={event.official_url}>Official source</a> : null}{event.registration_url ? <a href={event.registration_url}>Registration</a> : null}<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue} ${event.city} ${event.state}`)}`}>Directions</a></div></article><EventEngagementPanel event={event} />
    <section><h2>Nearby rider-friendly businesses</h2>{planner?.businesses.length ? planner.businesses.map((b) => <article className="dashboard-card" key={b.id}><strong>{b.name}</strong>{b.is_sponsored ? <span> Sponsored</span> : null}<p>{b.category} • {b.distance_miles} miles</p><a href={`/business/${b.slug}`}>View business</a></article>) : <p className="empty-state">No approved nearby businesses are available yet.</p>}</section>
    <p className="field-help">Event information is based on official sources available when last verified. Always confirm final details with the organizer before traveling.</p></section></main>;
}
