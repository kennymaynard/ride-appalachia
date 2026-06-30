"use client";

import { FormEvent, useState } from "react";
import { createBusinessReview } from "../lib/api";

type Props = {
  businessId: number;
  businessName: string;
};

export function BusinessReviewForm({ businessId, businessName }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(false);
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      await createBusinessReview({
        business_id: businessId,
        rider_name: String(formData.get("riderName") || "").trim(),
        rating: Number(formData.get("rating") || 5),
        comment: String(formData.get("comment") || "").trim(),
      });
      setSubmitted(true);
      event.currentTarget.reset();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to submit business review.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="business-review-section" id="business-reviews">
      <div className="section-heading">
        <p>Business reviews</p>
        <h2>Review {businessName}</h2>
      </div>
      <form className="review-form" onSubmit={submitReview}>
        <div>
          <p className="eyebrow">Leave a business review</p>
          <h3>Help riders know what to expect.</h3>
        </div>
        <label>
          Rider name
          <input required name="riderName" placeholder="Your name" />
        </label>
        <label>
          Rating
          <select required defaultValue="5" name="rating">
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="3">3 stars</option>
            <option value="2">2 stars</option>
            <option value="1">1 star</option>
          </select>
        </label>
        <label>
          Review
          <textarea
            required
            name="comment"
            placeholder="Parking, trailer access, service, food, lodging, pricing, or anything riders should know."
          />
        </label>
        {submitted ? (
          <p className="form-success">Review submitted. It will show after approval.</p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </section>
  );
}
