"use client";
import { use, useState } from "react";
import { acceptSafetyInvite } from "../../../../lib/api";

export default function SafetyInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params); const [status, setStatus] = useState("You were invited to a private trusted circle.");
  return <main className="section-shell"><section className="dashboard-card"><p className="eyebrow">Private safety invitation</p><h1>Join trusted circle</h1><p>{status}</p><button type="button" onClick={() => acceptSafetyInvite(token).then(() => setStatus("Invitation accepted. This does not automatically share anyone's location.")).catch((error) => setStatus(error.message))}>Accept Invitation</button></section></main>;
}
