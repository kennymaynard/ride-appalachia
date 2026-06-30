"use client";

import { FormEvent, useEffect, useState } from "react";
import { createMarketingLead } from "../lib/api";

const STORAGE_KEY = "appalachia-launch-access";

function readStoredValue(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
  }
}

export function LaunchAccessPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (readStoredValue(STORAGE_KEY)) return;
    const timer = window.setTimeout(() => setIsOpen(true), 3500);
    return () => window.clearTimeout(timer);
  }, []);

  function close() {
    writeStoredValue(STORAGE_KEY, "dismissed");
    setIsOpen(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await createMarketingLead({
        lead_type: "launch_access",
        email: String(form.get("email") || ""),
        business_name: "",
        category: "",
        area: "",
        phone: "",
        website: "",
        source: "launch_popup",
        notes: "Homepage launch access signup",
      });
      writeStoredValue(STORAGE_KEY, "joined");
      setSubmitted(true);
    } catch {
      setError("Could not save your email. Try again in a minute.");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="launch-popup" role="dialog" aria-modal="true" aria-labelledby="launch-popup-title">
      <div>
        <button type="button" onClick={close} aria-label="Close launch access popup">
          ×
        </button>
        {submitted ? (
          <>
            <h2 id="launch-popup-title">You are on the list.</h2>
            <p>We will use launch access for new trails, cabins, deals, and events.</p>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="eyebrow">Get launch access</p>
            <h2 id="launch-popup-title">Be first to discover new trails, cabins, deals, and events.</h2>
            <label>
              Email
              <input required name="email" type="email" placeholder="you@example.com" />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit">Join Launch List</button>
          </form>
        )}
      </div>
    </div>
  );
}
