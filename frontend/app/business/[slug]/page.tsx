import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessPhoto } from "../../../components/BusinessPhoto";
import { TrackedAction } from "../../../components/TrackedAction";
import { getListing } from "../../../lib/api";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function BusinessListingPage({ params }: Props) {
  const { slug } = await params;
  const business = await getListing(slug);

  if (!business) {
    notFound();
  }

  const primaryDeal = business.deals.find((deal) => deal.is_active);

  return (
    <main className="detail-page">
      <section className="detail-hero">
        <div className="detail-image">
          <BusinessPhoto
            alt=""
            category={business.category}
            src={business.photo_url}
          />
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{business.category}</p>
          <h1>{business.name}</h1>
          <p>{business.description}</p>
          <dl>
            <div>
              <dt>Phone</dt>
              <dd>{business.phone}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{business.location}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{business.category}</dd>
            </div>
          </dl>
          {primaryDeal ? (
            <div className="deal-callout">
              <span>Deal</span>
              <strong>{primaryDeal.title}</strong>
              <p>{primaryDeal.description}</p>
              {primaryDeal.code ? <code>{primaryDeal.code}</code> : null}
            </div>
          ) : null}
          <div className="hero-actions">
            <TrackedAction businessId={business.id} href={`tel:${business.phone}`}>
              Call
            </TrackedAction>
            {business.website_url ? (
              <TrackedAction businessId={business.id} href={business.website_url}>
                Book
              </TrackedAction>
            ) : null}
            {primaryDeal ? (
              <TrackedAction
                businessId={business.id}
                dealId={primaryDeal.id}
                href={`tel:${business.phone}`}
              >
                Claim Deal
              </TrackedAction>
            ) : null}
            <TrackedAction
              businessId={business.id}
              href={`/business/claim?slug=${business.slug}`}
              kind="link"
            >
              Claim This Business
            </TrackedAction>
          </div>
        </div>
      </section>
      <Link className="back-link" href="/">
        ← Back to marketplace
      </Link>
    </main>
  );
}
