"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ExploreDestination } from "../lib/types";
import { ExplorePlaceholder } from "./ExploreBrowser";
import { AddExploreToTrip } from "./AddExploreToTrip";

const groups = [
  ["Eat", ["local_food", "ice_cream_desserts"]],
  ["Stay", ["lodging", "campgrounds"]],
  ["See", ["waterfalls", "scenic_overlooks", "elk_viewing", "historic_sites", "museums"]],
  ["Do", ["fishing", "hiking", "swimming", "family_activities", "parks", "events"]],
  ["Shop", ["local_shops", "country_stores"]],
  ["Essentials", ["fuel", "repairs_recovery", "hospitals_urgent_care"]],
] as const;

type Props = {
  areaName: string;
  areaSlug: string;
  latitude: number;
  longitude: number;
  destinations: ExploreDestination[];
};

export function ExploreNearTrail({ areaName, areaSlug, latitude, longitude, destinations }: Props) {
  const [radius, setRadius] = useState(25);
  const nearby = useMemo(
    () => destinations.filter((item) => item.distance_miles != null && item.distance_miles <= radius).slice(0, 6),
    [destinations, radius],
  );
  const exploreQuery = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude), distance: String(radius), near: areaName,
  }).toString();

  return <section className="page-section explore-near-trail" aria-labelledby={`explore-near-${areaSlug}`}>
    <div className="section-heading explore-near-heading">
      <div><p>More than the trail</p><h2 id={`explore-near-${areaSlug}`}>Explore Near This Trail</h2><span>Food, lodging, attractions, activities, shops, and essential stops near {areaName}.</span></div>
      <div className="explore-radius" aria-label="Distance from trail">
        {[5, 10, 25, 50].map((miles) => <button className={radius === miles ? "is-active" : ""} key={miles} onClick={() => setRadius(miles)} type="button">Within {miles} miles</button>)}
      </div>
    </div>
    {nearby.length ? <div className="explore-near-groups">{groups.map(([label, categories]) => {
      const items = nearby.filter((item) => (categories as readonly string[]).includes(item.category));
      return items.length ? <section key={label}><h3>{label}</h3><div>{items.map((item) => <article key={item.id}>
        {item.image_url ? <img src={item.image_url} alt="" /> : <ExplorePlaceholder item={item} />}
        <div><p>{item.category.replaceAll("_", " ")}</p><h4>{item.name}</h4><span>{item.distance_miles} miles away · {item.city}, {item.state}</span>{item.featured ? <strong>Featured</strong> : null}<AddExploreToTrip compact destination={item}/><Link href={`/explore/${item.slug}`}>View Details</Link></div>
      </article>)}</div></section> : null;
    })}</div> : <p className="empty-state">No approved Explore destinations are within {radius} miles yet.</p>}
    <div className="explore-near-footer"><Link href={`/explore?${exploreQuery}`}>See Everything Near This Trail</Link></div>
  </section>;
}
