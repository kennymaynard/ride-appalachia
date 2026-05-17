"use client";

import { FormEvent, useMemo, useState } from "react";
import { createTrailReview } from "../lib/api";
import type { TrailReview } from "../lib/types";

type Props = {
  areaSlug: string;
  areaName: string;
  reviews: TrailReview[];
};

function stars(rating: number) {
  return "★★★★★".slice(0, rating);
}

export function TrailReviews({ areaSlug, areaName, reviews }: Props) {
  const [visibleReviews] = useState(reviews);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const averageRating = useMemo(() => {
    if (!visibleReviews.length) return 0;
    return visibleReviews.reduce((total, review) => total + review.rating, 0) / visibleReviews.length;
  }, [visibleReviews]);

  const ratingCounts = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: visibleReviews.filter((review) => review.rating === rating).length,
  }));

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitted(false);
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      await createTrailReview({
        areaSlug,
        riderName: String(formData.get("riderName") || "").trim(),
        rating: Number(formData.get("rating") || 5),
        rideDate: String(formData.get("rideDate") || "").trim() || "Recent ride",
        machine: String(formData.get("machine") || "").trim() || "Not specified",
        difficulty: String(formData.get("difficulty") || "Moderate") as TrailReview["difficulty"],
        trailCondition: String(formData.get("trailCondition") || "").trim(),
        comment: String(formData.get("comment") || "").trim(),
      });
      setSubmitted(true);
      event.currentTarget.reset();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to submit review.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="trail-reviews">
      <div className="section-heading">
        <p>Rider reviews</p>
        <h2>What riders say about {areaName}</h2>
      </div>

      <div className="trail-review-layout">
        <article className="review-summary">
          <strong>{averageRating ? averageRating.toFixed(1) : "New"}</strong>
          <span>{averageRating ? stars(Math.round(averageRating)) : "No reviews yet"}</span>
          <p>{visibleReviews.length} rider reviews</p>
          <div className="rating-bars">
            {ratingCounts.map((item) => (
              <div key={item.rating}>
                <span>{item.rating}</span>
                <meter min="0" max={Math.max(visibleReviews.length, 1)} value={item.count} />
                <small>{item.count}</small>
              </div>
            ))}
          </div>
        </article>

        <div className="review-list">
          {visibleReviews.map((review) => (
            <article key={review.id}>
              <div className="review-topline">
                <div>
                  <h3>{review.riderName}</h3>
                  <span>{review.rideDate} • {review.machine}</span>
                </div>
                <strong>{stars(review.rating)}</strong>
              </div>
              <div className="review-tags">
                <small>{review.difficulty}</small>
                <small>{review.trailCondition}</small>
              </div>
              <p>{review.comment}</p>
            </article>
          ))}
        </div>

        <form className="review-form" onSubmit={submitReview}>
          <div>
            <p className="eyebrow">Leave a review</p>
            <h3>Help the next rider plan smarter.</h3>
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
            Machine
            <input name="machine" placeholder="ATV, UTV, rental, mixed group" />
          </label>
          <label>
            Ride date
            <input name="rideDate" placeholder="Spring weekend, July ride, recent trip" />
          </label>
          <label>
            Difficulty
            <select required defaultValue="Moderate" name="difficulty">
              <option value="Easy">Easy</option>
              <option value="Moderate">Moderate</option>
              <option value="Hard">Hard</option>
            </select>
          </label>
          <label>
            Trail condition
            <input name="trailCondition" placeholder="Dry, muddy, rocky, beginner-friendly, technical" />
          </label>
          <label>
            Review
            <textarea required name="comment" placeholder="Trail condition, difficulty, staging, fuel, lodging, or anything riders should know." />
          </label>
          {submitted ? (
            <p className="form-success">Review submitted. It will show after admin approval.</p>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>
    </section>
  );
}
