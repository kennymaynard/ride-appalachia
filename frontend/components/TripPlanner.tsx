"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Business, Category } from "../lib/types";
import { TrackedAction } from "./TrackedAction";

type PlannerItem = {
  id: string;
  label: string;
  detail: string;
  category: Exclude<Category, "deals">;
};

type Props = {
  initialLocation?: string;
  listings: Business[];
};

const plannerItems: PlannerItem[] = [
  {
    id: "sleep",
    label: "Place to stay",
    detail: "Cabin, campground, hotel, or rider-friendly rental.",
    category: "lodging",
  },
  {
    id: "eat",
    label: "Food stops",
    detail: "Breakfast, dinner, group meals, and local rider deals.",
    category: "food",
  },
  {
    id: "rent",
    label: "Machine rental",
    detail: "ATV, UTV, helmets, pickup windows, and trail advice.",
    category: "rentals",
  },
  {
    id: "repair",
    label: "Repair backup",
    detail: "Tires, belts, fluids, parts, and quick-turn service.",
    category: "repairs",
  },
  {
    id: "fuel",
    label: "Fuel and supplies",
    detail: "Gas, ice, straps, gloves, snacks, and trailhead basics.",
    category: "fuel",
  },
];

const tripSteps = [
  "Pick your trail area",
  "Lock in lodging",
  "Save food and fuel stops",
  "Add rental or repair backup",
  "Claim any available deals",
  "Call/book the essentials",
];

const defaultSelected = ["sleep", "eat", "fuel"];
const storageKey = "ride-appalachia-trip-planner";

function isPlannerCategory(category: Category): category is Exclude<Category, "deals"> {
  return category !== "deals";
}

export function TripPlanner({ initialLocation = "", listings }: Props) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const [locationFilter, setLocationFilter] = useState(initialLocation);
  const [copyStatus, setCopyStatus] = useState("");

  const selectedItems = useMemo(
    () => plannerItems.filter((item) => selected.includes(item.id)),
    [selected],
  );

  const selectedCategories = useMemo(
    () => new Set(selectedItems.map((item) => item.category)),
    [selectedItems],
  );

  const matches = useMemo(
    () =>
      listings.filter(
        (business) => {
          const locationMatches = locationFilter
            ? business.location.toLowerCase().includes(locationFilter.toLowerCase())
            : true;

          return (
            isPlannerCategory(business.category) &&
            selectedCategories.has(business.category) &&
            locationMatches
          );
        },
      ),
    [listings, locationFilter, selectedCategories],
  );

  const tripSummary = useMemo(() => {
    const selectedNeedText = selectedItems.map((item) => `- ${item.label}`).join("\n");
    const matchText = matches
      .map((business) => {
        const activeDeal = business.deals.find((deal) => deal.is_active);
        const dealText = activeDeal
          ? `\n  Deal: ${activeDeal.title}${activeDeal.code ? ` (${activeDeal.code})` : ""}`
          : "";

        return `- ${business.name} (${business.category})\n  ${business.location}\n  ${business.phone}${dealText}`;
      })
      .join("\n\n");

    return [
      "Appalachia Offroad Trip Plan",
      "",
      `Trail area: ${locationFilter || "Any area"}`,
      "",
      "Needs:",
      selectedNeedText || "- No needs selected yet",
      "",
      "Stops:",
      matchText || "- Pick checklist items to add stops",
    ].join("\n");
  }, [locationFilter, matches, selectedItems]);

  useEffect(() => {
    const savedValue = window.localStorage.getItem(storageKey);
    if (!savedValue) return;

    try {
      const savedSelected = JSON.parse(savedValue);
      if (Array.isArray(savedSelected)) {
        const validIds = new Set(plannerItems.map((item) => item.id));
        const nextSelected = savedSelected.filter((item) => validIds.has(item));
        if (nextSelected.length) setSelected(nextSelected);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(selected));
  }, [selected]);

  function toggleItem(id: string) {
    setCopyStatus("");
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function startOver() {
    setSelected(defaultSelected);
    setLocationFilter(initialLocation);
    setCopyStatus("");
    window.localStorage.setItem(storageKey, JSON.stringify(defaultSelected));
  }

  async function copyTripPlan() {
    setCopyStatus("");

    try {
      await window.navigator.clipboard.writeText(tripSummary);
      setCopyStatus("Trip plan copied.");
    } catch {
      setCopyStatus("Copy was blocked. Use print instead.");
    }
  }

  return (
    <section className="planner-shell">
      <div className="planner-checklist">
        <div className="section-heading">
          <p>Weekend checklist</p>
          <h2>Tell us what you need</h2>
        </div>

        <div className="planner-options">
          <label className="planner-location">
            Trail area or town
            <input
              placeholder="Hatfield, Inez, Matewan..."
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
            />
          </label>
          {plannerItems.map((item) => (
            <label
              className={
                selected.includes(item.id)
                  ? "planner-option is-selected"
                  : "planner-option"
              }
              key={item.id}
            >
              <input
                checked={selected.includes(item.id)}
                type="checkbox"
                onChange={() => toggleItem(item.id)}
              />
              <span>{item.label}</span>
              <small>{item.detail}</small>
            </label>
          ))}
        </div>
      </div>

      <aside className="planner-board">
        <div className="section-heading">
          <p>Trip planner</p>
          <h2>Your road map</h2>
        </div>

        <ol className="roadmap-list">
          {tripSteps.map((step, index) => (
            <li key={step}>
              <span>{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>

        <div className="planner-needs">
          <h3>Selected needs</h3>
          {selectedItems.length ? (
            selectedItems.map((item) => <span key={item.id}>{item.label}</span>)
          ) : (
            <p>Choose a few needs to build the trip.</p>
          )}
        </div>

        <div className="planner-tools">
          <button type="button" onClick={copyTripPlan}>
            Copy Trip Plan
          </button>
          <button type="button" onClick={() => window.print()}>
            Print
          </button>
          <button type="button" onClick={startOver}>
            Start Over
          </button>
          {copyStatus ? <p>{copyStatus}</p> : null}
        </div>
      </aside>

      <div className="planner-results">
        <div className="section-heading">
          <p>Matches</p>
          <h2>Useful stops for this trip</h2>
        </div>

        {matches.length ? (
          <div className="planner-match-grid">
            {matches.map((business) => {
              const activeDeal = business.deals.find((deal) => deal.is_active);

              return (
                <article className="planner-match" key={business.id}>
                  <div>
                    <span>{business.category}</span>
                    <h3>{business.name}</h3>
                    <p>{business.location}</p>
                    {activeDeal ? <strong>{activeDeal.title}</strong> : null}
                  </div>
                  <div>
                    <TrackedAction
                      businessId={business.id}
                      href={`/business/${business.slug}`}
                      kind="link"
                    >
                      View
                    </TrackedAction>
                    <TrackedAction businessId={business.id} href={`tel:${business.phone}`}>
                      Call
                    </TrackedAction>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">Pick items from the checklist to see matches.</p>
        )}
      </div>

      <div className="planner-summary">
        <div className="section-heading">
          <p>Shareable summary</p>
          <h2>Weekend plan</h2>
        </div>
        <pre>{tripSummary}</pre>
      </div>
    </section>
  );
}
