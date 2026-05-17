import Link from "next/link";
import { ClaimBusiness } from "../../../components/ClaimBusiness";
import { getListing } from "../../../lib/api";

type Props = {
  searchParams: Promise<{ slug?: string }>;
};

export default async function ClaimBusinessPage({ searchParams }: Props) {
  const { slug } = await searchParams;
  const business = slug ? await getListing(slug) : null;

  if (!business) {
    return (
      <main className="page">
        <section className="page-hero compact">
          <p className="eyebrow">Claim listing</p>
          <h1>Choose a business listing to claim.</h1>
          <p>
            Open a public listing, then use the claim button to connect it to a
            founding partner tier.
          </p>
          <Link href="/">Back to marketplace</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Business claim</p>
        <h1>Claim your listing and pick a founding partner tier.</h1>
        <p>
          Claims are reviewed before ownership is approved. Add your owner email,
          choose the visibility tier that fits your business, then continue to
          checkout.
        </p>
      </section>

      <ClaimBusiness business={business} />
    </main>
  );
}
