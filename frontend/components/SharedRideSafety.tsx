"use client";
import { useEffect, useState } from "react";
import { getSharedSafetySession } from "../lib/api";

export function SharedRideSafety({ shareToken }: { shareToken: string }) {
  const [ride, setRide] = useState<any>(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; const load = () => getSharedSafetySession(shareToken).then((data) => active && setRide(data)).catch((caught) => active && setError(caught.message)); load(); const timer = window.setInterval(load, 30000); return () => { active = false; clearInterval(timer); }; }, [shareToken]);
  if (error) return <section className="dashboard-card"><h1>Shared ride unavailable</h1><p>{error}</p></section>;
  if (!ride) return <section className="dashboard-card"><p>Loading shared ride…</p></section>;
  const location = ride.last_location; const maps = location ? `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}` : "";
  return <section className="rider-dashboard"><article className="dashboard-card">
    <p className="eyebrow">Private rider safety link</p><h1>{ride.rider_name}: {ride.title}</h1>
    <p><strong>Status: {ride.status === "active" ? ride.freshness : ride.status}</strong></p>
    <p>Expected return: {new Date(ride.expected_return_at).toLocaleString()}</p>
    {location ? <><p>Last received: {new Date(location.server_received_at).toLocaleString()}</p><p>Accuracy: {location.accuracy_meters ? `within about ${Math.round(location.accuracy_meters)} meters` : "not reported"}</p>{location.battery_percent !== null ? <p>Battery: {location.battery_percent}%</p> : null}<a className="button-link" href={maps}>Directions to last known location</a></> : <p>No location has been received yet.</p>}
    <a className="button-link secondary" href="tel:911">Call 911</a>
    <p className="field-help">Appalachia Offroad is not an emergency service. Location can be delayed or unavailable.</p>
  </article><article className="dashboard-card"><h2>Rider updates</h2>{ride.messages.length ? ride.messages.map((message: any) => <p key={message.id}><strong>{message.text}</strong> · {new Date(message.created_at).toLocaleString()}</p>) : <p>No updates sent.</p>}</article>
  <article className="dashboard-card"><h2>Checkpoints</h2>{ride.checkpoints?.length ? ride.checkpoints.map((checkpoint: any) => <p key={checkpoint.id}><strong>{checkpoint.name}</strong> · {new Date(checkpoint.due_at).toLocaleString()} · {checkpoint.arrived_at ? "Arrived" : checkpoint.status}</p>) : <p>No checkpoints scheduled.</p>}</article></section>;
}
