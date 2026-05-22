"use client";

import { FormEvent, useEffect, useState } from "react";

const STORAGE_KEY = "appalachia-launch-access";

export function LaunchAccessPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY)) return;
    const timer = window.setTimeout(() => setIsOpen(true), 3500);
    return () => window.clearTimeout(timer);
  }, []);

  function close() {
    window.localStorage.setItem(STORAGE_KEY, "dismissed");
    setIsOpen(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem(STORAGE_KEY, "joined");
    setSubmitted(true);
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
              <input required type="email" placeholder="you@example.com" />
            </label>
            <button type="submit">Join Launch List</button>
          </form>
        )}
      </div>
    </div>
  );
}
