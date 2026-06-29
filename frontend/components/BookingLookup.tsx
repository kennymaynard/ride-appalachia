"use client";

import { FormEvent, useState } from "react";
import { lookupBooking, requestBookingCancellation } from "../lib/api";
import type { BookingDetail } from "../lib/types";

type Props = {
  initialBookingId?: string;
};

function centsToDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusText(value: string) {
  return value.replaceAll("_", " ");
}

export function BookingLookup({ initialBookingId = "" }: Props) {
  const [bookingId, setBookingId] = useState(initialBookingId);
  const [customerEmail, setCustomerEmail] = useState("");
  const [reason, setReason] = useState("");
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  async function findBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsLoading(true);
    try {
      const result = await lookupBooking({
        booking_id: Number(bookingId),
        customer_email: customerEmail,
      });
      setBooking(result);
      setStatus("Booking found.");
    } catch (caughtError) {
      setBooking(null);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to find booking.");
    } finally {
      setIsLoading(false);
    }
  }

  async function submitCancellation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!booking) return;
    setError("");
    setStatus("");
    setIsCanceling(true);
    try {
      const updatedBooking = await requestBookingCancellation(booking.id, {
        customer_email: booking.customer_email,
        reason,
      });
      setBooking({
        ...booking,
        ...updatedBooking,
      });
      setReason("");
      setStatus("Cancellation request sent to the business.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to request cancellation.",
      );
    } finally {
      setIsCanceling(false);
    }
  }

  const canRequestCancel =
    booking &&
    !["canceled", "declined"].includes(booking.status) &&
    booking.refund_status !== "requested" &&
    booking.refund_status !== "approved";

  return (
    <section className="booking-lookup-shell">
      <form className="dashboard-card booking-lookup-card" onSubmit={findBooking}>
        <h2>Find Your Booking</h2>
        <label>
          Booking ID
          <input
            required
            inputMode="numeric"
            value={bookingId}
            onChange={(event) => setBookingId(event.target.value)}
            placeholder="123"
          />
        </label>
        <label>
          Email used for booking
          <input
            required
            type="email"
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Finding..." : "Find Booking"}
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}
      {status ? <p className="form-success">{status}</p> : null}

      {booking ? (
        <article className="dashboard-card booking-detail-card">
          <div className="listing-meta">
            <span>Booking #{booking.id}</span>
            <span>{statusText(booking.status)}</span>
          </div>
          <h2>{booking.listing_title || "Trip booking"}</h2>
          <p>{booking.business_name}</p>
          <dl>
            <div>
              <dt>Dates</dt>
              <dd>{booking.start_date} to {booking.end_date}</dd>
            </div>
            <div>
              <dt>Guests</dt>
              <dd>{booking.guests}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{centsToDollars(booking.total_cents)}</dd>
            </div>
            <div>
              <dt>Refund review</dt>
              <dd>{statusText(booking.refund_status)}</dd>
            </div>
          </dl>

          <div className="policy-panel">
            <h3>Cancellation Policy</h3>
            <p>{booking.cancellation_policy}</p>
            <h3>Refund Policy</h3>
            <p>{booking.refund_policy}</p>
            <span>{booking.cancellation_window_hours} hour cancellation window</span>
          </div>

          {booking.refund_status === "requested" ? (
            <div className="alert-inline">
              <strong>Cancellation request pending</strong>
              <p>The business has your request and will approve or decline it from their dashboard.</p>
            </div>
          ) : null}

          {booking.refund_status === "approved" ? (
            <div className="alert-inline">
              <strong>Cancellation approved</strong>
              <p>{booking.cancellation_decision_note || "The business approved this cancellation."}</p>
            </div>
          ) : null}

          {booking.refund_status === "declined" ? (
            <div className="alert-inline">
              <strong>Cancellation declined</strong>
              <p>{booking.cancellation_decision_note || "The business declined this cancellation request."}</p>
            </div>
          ) : null}

          {canRequestCancel ? (
            <form className="cancel-request-form" onSubmit={submitCancellation}>
              <label>
                Reason for cancellation
                <textarea
                  required
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Tell the business what happened."
                />
              </label>
              <button type="submit" disabled={isCanceling}>
                {isCanceling ? "Sending..." : "Cancel Booking"}
              </button>
            </form>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
