"use client";
import { useEffect, useState } from "react";
import { addSafetyCircle, addSafetyContact, deleteSafetyContact, getSafetyCircles, getSafetyContacts, inviteSafetyMember } from "../lib/api";

type Contact = { id: number; name: string; email: string; phone: string; sms_opt_in: boolean; email_opt_in: boolean };
type Circle = { id: number; name: string; members: { id: number; name: string; status: string }[] };

export function RiderSafetySetup({ accessToken }: { accessToken: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]); const [circles, setCircles] = useState<Circle[]>([]);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [sms, setSms] = useState(false);
  const [circleName, setCircleName] = useState("Family & Friends"); const [inviteUrl, setInviteUrl] = useState(""); const [status, setStatus] = useState("");
  const refresh = () => Promise.all([getSafetyContacts(accessToken), getSafetyCircles(accessToken)]).then(([nextContacts, nextCircles]) => { setContacts(nextContacts); setCircles(nextCircles); }).catch(() => setStatus("Unable to load safety contacts"));
  useEffect(() => { refresh(); }, [accessToken]);
  async function addContact() { try { await addSafetyContact({ name, email, phone, sms_opt_in: sms, email_opt_in: Boolean(email) }, accessToken); setName(""); setEmail(""); setPhone(""); setStatus("Emergency contact saved"); await refresh(); } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to save contact"); } }
  async function createCircle() { try { await addSafetyCircle(circleName, accessToken); setStatus("Trusted circle created"); await refresh(); } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to create circle"); } }
  async function invite(circleId: number) { try { const result = await inviteSafetyMember(circleId, { name, email, phone }, accessToken); setInviteUrl(result.invite_url); setStatus("Invitation created. Send this link privately."); await refresh(); } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to invite member"); } }
  return <article className="dashboard-card"><p className="eyebrow">Trusted safety network</p><h2>Contacts and private circles</h2><p>{status}</p>
    <label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Trusted contact" /></label>
    <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label>Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
    <label className="checkbox-row"><input type="checkbox" checked={sms} onChange={(event) => setSms(event.target.checked)} />This contact agreed to receive safety texts.</label>
    <button type="button" disabled={!name || (!email && !phone)} onClick={addContact}>Add Emergency Contact</button>
    {contacts.map((contact) => <p key={contact.id}><strong>{contact.name}</strong> · {contact.email || contact.phone} <button type="button" onClick={async () => { await deleteSafetyContact(contact.id, accessToken); refresh(); }}>Remove</button></p>)}
    <hr /><label>Circle name<input value={circleName} onChange={(event) => setCircleName(event.target.value)} /></label><button type="button" onClick={createCircle}>Create Trusted Circle</button>
    {circles.map((circle) => <div key={circle.id}><h3>{circle.name}</h3><p>{circle.members.length ? circle.members.map((member) => `${member.name} (${member.status})`).join(", ") : "No members yet."}</p><button type="button" disabled={!name || (!email && !phone)} onClick={() => invite(circle.id)}>Invite Contact Above</button></div>)}
    {inviteUrl ? <label>Single-use invitation link<input readOnly value={inviteUrl} /><button type="button" onClick={() => navigator.clipboard.writeText(inviteUrl)}>Copy Invitation</button></label> : null}
    <p className="field-help">Circle membership never starts location sharing. Every ride must still be shared explicitly.</p>
  </article>;
}
