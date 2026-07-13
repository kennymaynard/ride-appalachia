"use client";

import { useEffect, useState } from "react";
import { getAdminBusinessClaims, reviewAdminBusinessClaim } from "../lib/api";
import type { BusinessClaim } from "../lib/types";

export function BusinessClaimsPanel({ adminPassword }: { adminPassword: string }) {
  const [claims, setClaims] = useState<BusinessClaim[]>([]);
  const [status, setStatus] = useState("");
  const [workingId, setWorkingId] = useState<number | null>(null);

  useEffect(() => {
    getAdminBusinessClaims(adminPassword).then(setClaims).catch((error) => setStatus(error instanceof Error ? error.message : "Unable to load claims"));
  }, [adminPassword]);

  async function review(claim: BusinessClaim, action: "approve" | "reject") {
    const notes = window.prompt(`${action === "approve" ? "Approval" : "Rejection"} notes`, "Proof reviewed by admin.");
    if (notes === null) return;
    setWorkingId(claim.id);
    try {
      await reviewAdminBusinessClaim(claim.id, action, notes, adminPassword);
      setClaims((current) => current.filter((item) => item.id !== claim.id));
      setStatus(action === "approve" ? "Ownership verified. Secure owner access was issued." : "Claim rejected.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to review claim"); }
    finally { setWorkingId(null); }
  }

  return <section className="admin-panel">
    <div className="section-heading"><p className="eyebrow">Ownership verification</p><h2>Business claims ({claims.length})</h2></div>
    <p>Access is granted only after the proof of ownership or management authority is reviewed here.</p>
    {status ? <p>{status}</p> : null}
    <div className="admin-list">
      {claims.map((claim) => <article className="admin-business-card" key={claim.id}>
        <div><strong>{claim.claimant_name}</strong> · {claim.claimant_role}<br />{claim.claimant_email} · {claim.claimant_phone}<p>{claim.proof_notes}</p>{claim.proof_url ? <a href={claim.proof_url} rel="noreferrer" target="_blank">Open proof</a> : <strong>No proof link — verify notes manually</strong>}</div>
        <div className="admin-actions"><button disabled={workingId === claim.id} type="button" onClick={() => review(claim, "approve")}>Approve ownership</button><button disabled={workingId === claim.id} type="button" onClick={() => review(claim, "reject")}>Reject</button></div>
      </article>)}
      {!claims.length ? <p className="empty-state">No pending ownership claims.</p> : null}
    </div>
  </section>;
}
