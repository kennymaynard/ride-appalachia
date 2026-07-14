"use client";

import { useEffect, useRef, useState } from "react";
import { addSafetyCheckpoint, arriveSafetyCheckpoint, createSafetySession, deleteSafetyLocationData, sendSafetyLocation, sendSafetyMessage, sendSafetySos, stopSafetySession, type SafetySession } from "../lib/api";

type QueuedUpdate = { kind: "location" | "message"; sessionId: number; payload: Record<string, unknown> };
type Checkpoint = { id: number; name: string; due_at: string; grace_minutes: number; arrived?: boolean };
const offlineQueueKey = "aoa_safety_offline_queue";

export function RiderSafetyTracker({ accessToken }: { accessToken: string }) {
  const [session, setSession] = useState<SafetySession | null>(null);
  const [title, setTitle] = useState("Today's ride");
  const [returnTime, setReturnTime] = useState(() => new Date(Date.now() + 4 * 3600000).toISOString().slice(0, 16));
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("Location sharing is off");
  const [checkpointName, setCheckpointName] = useState("");
  const [checkpointTime, setCheckpointTime] = useState("");
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const watchRef = useRef<number | null>(null);
  const sequenceRef = useRef(0);

  useEffect(() => {
    const saved = sessionStorage.getItem("aoa_active_safety_session");
    if (saved) {
      try {
        const restored = JSON.parse(saved) as SafetySession;
        if (restored.status === "active" && new Date(restored.expires_at).getTime() > Date.now()) {
          setSession(restored); setStatus("Sharing resumed — keep this page open"); watchLocation(restored);
        } else sessionStorage.removeItem("aoa_active_safety_session");
      } catch { sessionStorage.removeItem("aoa_active_safety_session"); }
    }
    return () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); };
  }, []);

  function watchLocation(next: SafetySession) {
    if (!navigator.geolocation) { setStatus("GPS is unavailable on this device"); return; }
    watchRef.current = navigator.geolocation.watchPosition(async ({ coords, timestamp }) => {
      const sequence = `${Date.now()}-${sequenceRef.current++}`;
      const payload = { sequence, latitude: coords.latitude, longitude: coords.longitude,
        accuracy_meters: coords.accuracy, heading: coords.heading, speed_mps: coords.speed,
        device_recorded_at: new Date(timestamp).toISOString() };
      try {
        await flushQueue();
        await sendSafetyLocation(next.id, payload, accessToken);
        setStatus(`Location sent ${new Date().toLocaleTimeString()}`);
      } catch { enqueue({ kind: "location", sessionId: next.id, payload }); setStatus("Offline — location queued, not sent yet"); }
    }, () => setStatus("Location permission is required"), { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
  }

  function enqueue(item: QueuedUpdate) {
    const current = JSON.parse(localStorage.getItem(offlineQueueKey) || "[]") as QueuedUpdate[];
    localStorage.setItem(offlineQueueKey, JSON.stringify([...current, item].slice(-250)));
  }

  async function flushQueue() {
    const queued = JSON.parse(localStorage.getItem(offlineQueueKey) || "[]") as QueuedUpdate[];
    if (!queued.length) return;
    for (let index = 0; index < queued.length; index += 1) {
      const item = queued[index];
      try {
        if (item.kind === "location") await sendSafetyLocation(item.sessionId, item.payload, accessToken);
        else await sendSafetyMessage(item.sessionId, String(item.payload.messageType), accessToken);
      } catch { localStorage.setItem(offlineQueueKey, JSON.stringify(queued.slice(index))); throw new Error("Queue remains offline"); }
    }
    localStorage.removeItem(offlineQueueKey);
  }

  async function start() {
    setStatus("Starting…");
    try {
      const next = await createSafetySession({ title, expected_return_at: new Date(returnTime).toISOString(), consent }, accessToken);
      localStorage.removeItem(offlineQueueKey); setSession(next); sessionStorage.setItem("aoa_active_safety_session", JSON.stringify(next)); watchLocation(next); setStatus("Sharing is on — keep this page open");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to start"); }
  }

  async function stop() {
    if (!session) return;
    await stopSafetySession(session.id, accessToken).catch(() => null);
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null; sessionStorage.removeItem("aoa_active_safety_session"); localStorage.removeItem(offlineQueueKey); setSession(null); setStatus("Location sharing stopped");
  }

  async function quickMessage(type: string) {
    if (!session) return;
    setStatus("Sending message…");
    try { await sendSafetyMessage(session.id, type, accessToken); setStatus("Message delivered to the shared ride page"); }
    catch { enqueue({ kind: "message", sessionId: session.id, payload: { messageType: type } }); setStatus("Offline — message queued, not sent yet"); }
  }

  async function addCheckpoint() {
    if (!session || !checkpointName || !checkpointTime) return;
    try { const item = await addSafetyCheckpoint(session.id, { name: checkpointName, due_at: new Date(checkpointTime).toISOString(), grace_minutes: 15 }, accessToken); setCheckpoints((current) => [...current, item]); setCheckpointName(""); setCheckpointTime(""); setStatus("Checkpoint scheduled with a 15-minute grace period"); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Unable to add checkpoint"); }
  }

  async function arrive(checkpoint: Checkpoint) {
    if (!session) return; await arriveSafetyCheckpoint(session.id, checkpoint.id, accessToken); setCheckpoints((current) => current.map((item) => item.id === checkpoint.id ? { ...item, arrived: true } : item)); setStatus("Checkpoint arrival confirmed");
  }

  async function sos() {
    if (!session || !window.confirm("Send your last known location to configured emergency contacts? This does NOT contact 911.")) return;
    try { const result = await sendSafetySos(session.id, accessToken); setStatus(result.deliveries_sent ? `SOS sent through ${result.deliveries_sent} contact channel(s)` : "SOS recorded, but no notification was delivered. Call 911 if needed."); }
    catch (error) { setStatus(error instanceof Error ? error.message : "SOS delivery failed — call 911 if needed"); }
  }

  async function deleteLocationData() {
    if (!session || !window.confirm("Stop sharing and permanently delete the precise locations stored for this ride?")) return;
    await deleteSafetyLocationData(session.id, accessToken); if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; sessionStorage.removeItem("aoa_active_safety_session"); localStorage.removeItem(offlineQueueKey); setSession(null); setStatus("Sharing stopped and stored ride locations deleted");
  }

  return <article className="dashboard-card rider-safety-card">
    <p className="eyebrow">Rider safety</p><h2>{session ? "Location Sharing On" : "Share this ride privately"}</h2>
    <p><strong>{status}</strong></p>
    {!session ? <>
      <label>Ride name<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>Expected return<input type="datetime-local" value={returnTime} onChange={(event) => setReturnTime(event.target.value)} /></label>
      <label className="checkbox-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />I choose to share my precise location for this ride with anyone I send the private link to.</label>
      <button type="button" disabled={!consent || !returnTime} onClick={start}>Start Private Sharing</button>
      <p className="field-help">Foreground web tracking is not guaranteed when your screen is locked or service is unavailable. It does not replace 911 or a satellite safety device.</p>
    </> : <>
      {session.share_url ? <div><label>Private, expiring viewer link<input readOnly value={session.share_url} /></label><button type="button" onClick={() => navigator.clipboard.writeText(session.share_url || "")}>Copy Link</button></div> : null}
      <div className="safety-message-grid">
        <button type="button" onClick={() => quickMessage("ok")}>I&apos;m OK</button>
        <button type="button" onClick={() => quickMessage("delayed")}>I&apos;m Delayed</button>
        <button type="button" onClick={() => quickMessage("returning")}>Heading Back</button>
        <button type="button" onClick={() => quickMessage("help")}>Need Help</button>
      </div>
      <div><h3>Ride checkpoints</h3><label>Checkpoint name<input value={checkpointName} onChange={(event) => setCheckpointName(event.target.value)} placeholder="Trailhead return" /></label><label>Due time<input type="datetime-local" value={checkpointTime} onChange={(event) => setCheckpointTime(event.target.value)} /></label><button type="button" onClick={addCheckpoint}>Schedule Checkpoint</button>{checkpoints.map((checkpoint) => <p key={checkpoint.id}><strong>{checkpoint.name}</strong> · {new Date(checkpoint.due_at).toLocaleString()} <button type="button" disabled={checkpoint.arrived} onClick={() => arrive(checkpoint)}>{checkpoint.arrived ? "Arrived" : "Mark Arrived"}</button></p>)}</div>
      <a className="button-link secondary" href="tel:911">Call 911</a>
      <button className="danger-button" type="button" onClick={sos}>Send SOS to My Contacts</button>
      <button className="danger-button" type="button" onClick={stop}>Stop Sharing Now</button>
      <button type="button" onClick={deleteLocationData}>Stop &amp; Delete This Ride&apos;s Locations</button>
    </>}
  </article>;
}
