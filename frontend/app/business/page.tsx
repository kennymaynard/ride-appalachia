import Link from "next/link";
import { BusinessDashboard } from "../../components/BusinessDashboard";
import { getListings } from "../../lib/api";

export default async function BusinessDashboardPage() {
  const businesses = await getListings("all");

  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Business dashboard</p>
        <h1>Edit listing, add deals, and view clicks.</h1>
        <p>
          MVP dashboard shell for partners. Auth can be added once business onboarding
          is validated.
        </p>
        <Link href="/business/join">Become a founding partner</Link>
      </section>

      <BusinessDashboard initialBusinesses={businesses} />
    </main>
  );
}
