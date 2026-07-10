import Link from "next/link";
import { BusinessDashboard } from "../../../../components/BusinessDashboard";
import { getBusinessByAccessToken } from "../../../../lib/api";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function BusinessAccessPage({ params }: Props) {
  const { token } = await params;
  const business = await getBusinessByAccessToken(decodeURIComponent(token));

  if (!business) {
    return (
      <main className="page">
        <section className="page-hero compact">
          <p className="eyebrow">Business access</p>
          <h1>This dashboard link needs a fresh login.</h1>
          <p>
            We could not verify this private business link. It may be expired,
            copied incorrectly, or tied to a listing that needs a new dashboard
            login email.
          </p>
          <div className="home-hero-actions" aria-label="Business access recovery">
            <Link href="/business/login">Send New Login Link</Link>
            <Link href="/contact">Contact Support</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Business access</p>
        <h1>Manage your Appalachia Offroad listing.</h1>
        <p>
          This private access link opens the dashboard for this business. Keep
          your login password private and update it from Business Settings when needed.
        </p>
        <Link href={`/business/${business.slug}`}>View public listing</Link>
      </section>

      <BusinessDashboard initialBusinesses={[business]} />
    </main>
  );
}
