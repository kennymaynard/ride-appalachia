import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessDashboard } from "../../../../components/BusinessDashboard";
import { getBusinessByAccessToken } from "../../../../lib/api";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function BusinessAccessPage({ params }: Props) {
  const { token } = await params;
  const business = await getBusinessByAccessToken(token);

  if (!business) {
    notFound();
  }

  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Business access</p>
        <h1>Manage your Appalachia Offroad listing.</h1>
        <p>
          This private access link opens the dashboard for this business while the
          MVP keeps full account login simple.
        </p>
        <Link href={`/business/${business.slug}`}>View public listing</Link>
      </section>

      <BusinessDashboard initialBusinesses={[business]} />
    </main>
  );
}
