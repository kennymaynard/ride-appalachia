"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { createTrailReview } from "../lib/api";
import type { TrailReview } from "../lib/types";

type Props = {
  areaSlug: string;
  areaName: string;
  reviews: TrailReview[];
};

const MAX_REVIEW_PHOTO_BYTES = 950_000;
const MAX_REVIEW_PHOTO_EDGE = 1600;
const REVIEW_PHOTO_QUALITIES = [0.82, 0.74, 0.66, 0.58, 0.5];

function stars(rating: number) {
  return "★★★★★".slice(0, rating);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read that image."));
    };
    image.src = url;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to prepare that image."));
    };
    reader.onerror = () => reject(new Error("Unable to prepare that image."));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Unable to resize that image."));
      },
      "image/jpeg",
      quality,
    );
  });
}

async function resizeReviewPhoto(file: File): Promise<string> {
  const image = await loadImage(file);
  const scale = Math.min(
    1,
    MAX_REVIEW_PHOTO_EDGE / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to resize that image.");

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const lowestQuality = REVIEW_PHOTO_QUALITIES[REVIEW_PHOTO_QUALITIES.length - 1];
  for (const quality of REVIEW_PHOTO_QUALITIES) {
    const blob = await canvasToBlob(canvas, quality);
    if (blob.size <= MAX_REVIEW_PHOTO_BYTES || quality === lowestQuality) {
      if (blob.size > MAX_REVIEW_PHOTO_BYTES) break;
      return blobToDataUrl(blob);
    }
  }

  throw new Error("That photo is still too large after resizing. Try a different image.");
}

export function TrailReviews({ areaSlug, areaName, reviews }: Props) {
  const [visibleReviews] = useState(reviews);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoStatus, setPhotoStatus] = useState("");
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
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
        photoUrl: String(formData.get("photoUrl") || "").trim(),
        photoCaption: String(formData.get("photoCaption") || "").trim(),
      });
      setSubmitted(true);
      setPhotoPreview("");
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

  async function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError("");
    setPhotoPreview("");
    setPhotoStatus("");
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      event.target.value = "";
      return;
    }

    setIsPreparingPhoto(true);
    setPhotoStatus("Preparing photo...");

    try {
      const resizedPhoto = await resizeReviewPhoto(file);
      setPhotoPreview(resizedPhoto);
      setPhotoStatus("Photo resized and ready.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to prepare that photo.",
      );
      event.target.value = "";
    } finally {
      setIsPreparingPhoto(false);
    }
  }

  return (
    <section className="trail-reviews" id="trail-reviews">
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
              {review.photoUrl ? (
                <figure className="review-photo">
                  <img alt={review.photoCaption || `${review.riderName} trail photo`} src={review.photoUrl} />
                  {review.photoCaption ? <figcaption>{review.photoCaption}</figcaption> : null}
                </figure>
              ) : null}
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
          <label>
            Add rider photo
            <input accept="image/*" type="file" disabled={isPreparingPhoto} onChange={handlePhotoUpload} />
          </label>
          <input name="photoUrl" type="hidden" value={photoPreview} readOnly />
          {photoStatus ? <p className="form-hint">{photoStatus}</p> : null}
          {photoPreview ? (
            <figure className="review-photo-preview">
              <img alt="Selected rider upload preview" src={photoPreview} />
              <figcaption>Photo will show after admin approval.</figcaption>
            </figure>
          ) : null}
          <label>
            Photo caption
            <input name="photoCaption" placeholder="Overlook, muddy section, waterfall stop..." />
          </label>
          {submitted ? (
            <p className="form-success">Review submitted. It will show after admin approval.</p>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" disabled={isSubmitting || isPreparingPhoto}>
            {isPreparingPhoto ? "Preparing Photo..." : isSubmitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>
    </section>
  );
}
