import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddExploreToTrip } from "../../../components/AddExploreToTrip";
import { ClaimExploreListing } from "../../../components/ClaimExploreListing";
import { ExplorePlaceholder } from "../../../components/ExploreBrowser";
import { getExploreDestination } from "../../../lib/api";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getExploreDestination(slug).catch(() => null);
  return item
    ? { title: `${item.name} | Explore Appalachia`, description: item.short_description }
    : { title: "Destination Not Found" };
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getExploreDestination(slug).catch(() => null);
  if (!item) notFound();

  const address = [item.address, item.city, item.state, item.postal_code].filter(Boolean).join(", ");
  const ownerDetails = [
    { title: "Amenities", items: item.amenities_json },
    { title: "Specials", items: item.specials_json },
    { title: "Upcoming events", items: item.events_json },
  ].filter((section) => section.items?.length);

  return (
    <main className="page">
      <section className="explore-detail">
        {item.image_url ? <img className="explore-detail-image" src={item.image_url} alt="" /> : <ExplorePlaceholder item={item} />}
        <div>
          <p className="eyebrow">{item.category.replaceAll("_", " ")}</p>
          <h1>{item.name}</h1>
          <p>{item.full_description || item.short_description}</p>
          <div className="listing-meta">
            {item.verified ? <span>Verified</span> : null}
            {item.family_friendly ? <span>Family friendly</span> : null}
            {item.free_admission ? <span>Free admission</span> : null}
          </div>
          <div className="hero-actions">
            <AddExploreToTrip destination={item} />
            <ClaimExploreListing slug={item.slug} category={item.category} claimed={Boolean(item.claimed_by_business_id)} />
            {item.latitude && item.longitude ? <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`}>Directions</a> : null}
            {item.website ? <a target="_blank" rel="noreferrer" href={item.website}>Website</a> : null}
          </div>
        </div>
      </section>
      <section className="explore-facts">
        <article><h2>Visit</h2><p>{address || "Address being verified"}</p><p>{item.phone || "Phone not listed"}</p><p>{item.admission_cost || "Admission information not listed"}</p></article>
        <article><h2>Plan ahead</h2><p><strong>Parking:</strong> {item.parking_info || "Not listed"}</p><p><strong>Accessibility:</strong> {item.accessibility_info || "Not listed"}</p><p><strong>Pets:</strong> {item.pet_policy || "Not listed"}</p><p><strong>Seasonal:</strong> {item.seasonal_info || "No seasonal notice"}</p></article>
        <article><h2>Help keep this accurate</h2><div className="admin-actions"><Link href={`/explore/${item.slug}/photo`}>Add a Photo</Link><Link href={`/explore/${item.slug}/report`}>Report Information</Link></div></article>
        {ownerDetails.map((section) => <article key={section.title}><h2>{section.title}</h2><ul className="explore-detail-list">{section.items.map((detail) => <li key={detail}>{detail}</li>)}</ul></article>)}
      </section>
    </main>
  );
}
