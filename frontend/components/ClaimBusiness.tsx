"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { claimBusiness as submitBusinessClaim, verifyBusinessClaimEmail } from "../lib/api";
import { partnerTiers } from "../lib/sample-data";
import type { Business, BusinessClaim, Tier } from "../lib/types";
import { requireRiderToken } from "../lib/rider-auth";

type Props = {
  business: Business;
};

export function ClaimBusiness({ business }: Props) {
  const [tier, setTier] = useState<Tier["id"]>(
    partnerTiers.some((item) => item.id === business.subscription_tier)
      ? (business.subscription_tier as Tier["id"])
      : partnerTiers[0].id,
  );
  const [claimantName, setClaimantName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState(business.owner_email || "");
  const [claimantPhone, setClaimantPhone] = useState("");
  const [claimantRole, setClaimantRole] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [submitted, setSubmitted] = useState<BusinessClaim|null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedTier = useMemo(
    () => partnerTiers.find((item) => item.id === tier) || partnerTiers[0],
    [tier],
  );
  async function claimBusiness() {
    const riderToken = requireRiderToken(`/business/claim?id=${business.id}`);
    if (!riderToken) return;
    setError("");
    setIsSubmitting(true);

    try {
      const claim = await submitBusinessClaim(business.id, {
        claimant_name: claimantName.trim(),
        claimant_email: ownerEmail.trim().toLowerCase(),
        claimant_phone: claimantPhone.trim(),
        claimant_role: claimantRole.trim(),
        proof_url: proofUrl.trim(),
        proof_notes: proofNotes.trim(),
        subscription_tier: tier,
      }, riderToken);
      setSubmitted(claim);
      setIsSubmitting(false);
    } catch (caughtError) {
      setIsSubmitting(false);
      setError(
        caughtError instanceof Error
          ? caughtError.message
            : "Unable to submit ownership claim.",
      );
    }
  }

  async function verifyCode(){if(!submitted)return;setError("");setIsSubmitting(true);try{const claim=await verifyBusinessClaimEmail(submitted.id,ownerEmail.trim().toLowerCase(),verificationCode);setSubmitted(claim)}catch(caughtError){setError(caughtError instanceof Error?caughtError.message:"Unable to verify code")}finally{setIsSubmitting(false)}}

  return (
    <section className="claim-shell">
      <article className="claim-summary">
        <div>
          <p className="eyebrow">Claim listing</p>
          <h2>{business.name}</h2>
          <p>{business.description}</p>
        </div>
        <dl>
          <div>
            <dt>Phone</dt>
            <dd>{business.phone}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{business.location}</dd>
          </div>
          <div>
            <dt>Current status</dt>
            <dd>{business.is_approved ? "Approved" : "Pending"}</dd>
          </div>
        </dl>
      </article>

      <div className="tier-grid selectable-tiers">
        {partnerTiers.map((item) => (
          <button
            className={item.id === tier ? "tier-card is-selected" : "tier-card"}
            key={item.id}
            type="button"
            onClick={() => setTier(item.id)}
          >
            <div>
              <p>{item.name}</p>
              <h3>
                {item.price}
                {item.id === "veteran_owned" ? null : <span>/mo</span>}
              </h3>
              <strong>{item.description}</strong>
            </div>
            <ul>
              {item.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <span>{item.id === tier ? "Selected" : "Choose"}</span>
          </button>
        ))}
      </div>

      <div className="claim-actions">
        <div>
          <p className="eyebrow">Selected plan</p>
          <h2>{selectedTier.name}</h2>
        </div>
        <label>
          Your full name
          <input required value={claimantName} onChange={(event) => setClaimantName(event.target.value)} />
        </label>
        <label>
          Owner email
          <input
            required
            type="email"
            value={ownerEmail}
            onChange={(event) => setOwnerEmail(event.target.value)}
            placeholder="you@yourbusiness.com"
          />
        </label>
        <label>
          Your phone
          <input
            required
            value={claimantPhone}
            onChange={(event) => setClaimantPhone(event.target.value)}
            placeholder="(606) 555-0142"
          />
        </label>
        <label>
          Role at the business
          <input required value={claimantRole} onChange={(event) => setClaimantRole(event.target.value)} placeholder="Owner, manager, authorized agent" />
        </label>
        <label>
          Proof link
          <input type="url" value={proofUrl} onChange={(event) => setProofUrl(event.target.value)} placeholder="Business website, registration, or document link" />
        </label>
        <label>
          Ownership or management proof
          <textarea required minLength={10} value={proofNotes} onChange={(event) => setProofNotes(event.target.value)} placeholder="Explain the proof provided and how an admin can verify your authority." />
        </label>
        {submitted ? <div className="claim-verification-result"><strong>Verification level: {submitted.verification_level}</strong><p>{submitted.verification_reason}</p>{submitted.requires_email_code?<><label>Six-digit code sent to your business email<input inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={verificationCode} onChange={event=>setVerificationCode(event.target.value.replace(/\D/g,""))}/></label><button disabled={isSubmitting||verificationCode.length!==6} type="button" onClick={verifyCode}>Verify Business Email</button></>:submitted.status==="approved"?<p className="form-success">Ownership verified. Check your email for secure business access.</p>:<p className="form-success">Claim submitted for admin verification. No account access is granted until it is approved.</p>}</div> : null}
        {error ? <p className="form-error">{error}</p> : null}
        <button
          type="button"
          disabled={isSubmitting || Boolean(submitted) || !claimantName.trim() || !ownerEmail.trim() || !claimantRole.trim() || proofNotes.trim().length < 10}
          onClick={claimBusiness}
        >
          {isSubmitting ? "Submitting proof…" : submitted ? "Claim submitted" : "Submit ownership claim"}
        </button>
        <Link href={`/business/${business.slug}`}>Back to listing</Link>
      </div>
    </section>
  );
}
