"use client";

import { FormEvent, useMemo, useState } from "react";
import { createTrailTalkPost } from "../lib/api";
import type { RideArea, TrailTalkCategory, TrailTalkPost } from "../lib/types";

type Props = {
  initialPosts: TrailTalkPost[];
  areas: RideArea[];
};

const categories: Array<{ id: TrailTalkCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "group_ride", label: "Group Rides" },
  { id: "trail_conditions", label: "Trail Conditions" },
  { id: "events", label: "Events" },
  { id: "buy_sell_trade", label: "Buy/Sell/Trade" },
  { id: "help_repairs", label: "Help & Repairs" },
  { id: "lodging_food", label: "Lodging/Food" },
  { id: "heroes_rides", label: "Heroes Rides" },
];

const initialForm = {
  rider_name: "",
  email: "",
  category: "group_ride" as TrailTalkCategory,
  area_slug: "",
  ride_date: "",
  title: "",
  message: "",
};

function categoryLabel(category: string) {
  return categories.find((item) => item.id === category)?.label || category.replaceAll("_", " ");
}

function areaLabel(areas: RideArea[], slug: string) {
  return areas.find((area) => area.slug === slug)?.name || "All Appalachia";
}

export function TrailTalkBoard({ initialPosts, areas }: Props) {
  const [posts] = useState(initialPosts);
  const [activeCategory, setActiveCategory] = useState<TrailTalkCategory | "all">("all");
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const filteredPosts = useMemo(
    () =>
      activeCategory === "all"
        ? posts
        : posts.filter((post) => post.category === activeCategory),
    [activeCategory, posts],
  );

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      await createTrailTalkPost({
        ...form,
        rider_name: form.rider_name.trim(),
        email: form.email.trim().toLowerCase(),
        title: form.title.trim(),
        message: form.message.trim(),
      });
      setForm(initialForm);
      setNotice("Post submitted. It will appear after admin review.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to submit this post.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="trail-talk-layout">
      <section className="trail-talk-feed" aria-label="Trail Talk posts">
        <div className="trail-talk-filters" aria-label="Trail Talk categories">
          {categories.map((category) => (
            <button
              key={category.id}
              className={activeCategory === category.id ? "is-active" : ""}
              type="button"
              onClick={() => setActiveCategory(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>

        {filteredPosts.length ? (
          <div className="trail-talk-list">
            {filteredPosts.map((post) => (
              <article className="trail-talk-post" key={post.id}>
                <div className="listing-meta">
                  <span>{categoryLabel(post.category)}</span>
                  <span>{areaLabel(areas, post.area_slug)}</span>
                  {post.ride_date ? <span>{post.ride_date}</span> : null}
                </div>
                <h2>{post.title}</h2>
                <p>{post.message}</p>
                <strong>{post.rider_name}</strong>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">No approved posts in this category yet.</p>
        )}
      </section>

      <aside className="trail-talk-submit" aria-label="Submit Trail Talk post">
        <form className="dashboard-card" onSubmit={submitPost}>
          <div>
            <p className="eyebrow">Trail Talk</p>
            <h2>Post to the ride board</h2>
          </div>
          <label>
            Rider name
            <input
              required
              value={form.rider_name}
              onChange={(event) => setForm({ ...form, rider_name: event.target.value })}
              placeholder="Your name"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="Optional"
            />
          </label>
          <label>
            Category
            <select
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value as TrailTalkCategory })
              }
            >
              {categories
                .filter((category) => category.id !== "all")
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Ride area
            <select
              value={form.area_slug}
              onChange={(event) => setForm({ ...form, area_slug: event.target.value })}
            >
              <option value="">All Appalachia</option>
              {areas.map((area) => (
                <option key={area.slug} value={area.slug}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ride date
            <input
              type="date"
              value={form.ride_date}
              onChange={(event) => setForm({ ...form, ride_date: event.target.value })}
            />
          </label>
          <label>
            Title
            <input
              required
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Who is riding this weekend?"
            />
          </label>
          <label>
            Message
            <textarea
              required
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              placeholder="Share meetup details, trail conditions, questions, or ride notes."
            />
          </label>
          {notice ? <p className="form-success">{notice}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit For Review"}
          </button>
        </form>
      </aside>
    </div>
  );
}
