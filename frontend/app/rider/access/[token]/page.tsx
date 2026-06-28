import Link from "next/link";
import { notFound } from "next/navigation";
import { RiderDashboard } from "../../../../components/RiderDashboard";
import { getRiderProfile } from "../../../../lib/api";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function RiderAccessPage({ params }: Props) {
  const { token } = await params;
  const rider = await getRiderProfile(token);

  if (!rider) {
    notFound();
  }

  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Rider profile</p>
        <h1>{rider.display_name} ride card.</h1>
        <p>
          Save finished trails, track badge progress, request Hero discounts,
          and keep storm or trail alerts tied to this profile.
        </p>
        <Link href="/ride-areas">Find Trails</Link>
      </section>

      <RiderDashboard accessToken={token} />
    </main>
  );
}
