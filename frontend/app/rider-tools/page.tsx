import type { Metadata } from "next";
import { RideAreaMap } from "../../components/RideAreaMap";
import { RiderTools } from "../../components/RiderTools";
import { getListings } from "../../lib/api";
import { rideAreas } from "../../lib/sample-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rider Tools | Appalachia Offroad App",
  description:
    "Save trails, track rides, and keep recent Appalachia offroad ride history on your device.",
};

export default async function RiderToolsPage() {
  const listings = await getListings("all");

  return (
    <main className="page rider-tools-page">
      <section className="page-hero compact">
        <p className="eyebrow">Rider tools</p>
        <h1>Save trails and track your ride.</h1>
        <p>
          Build a personal ride list, start a simple GPS ride tracker, and keep
          your recent ride stats on this device.
        </p>
      </section>

      <section className="page-section rider-public-map-section">
        <RideAreaMap areas={rideAreas} businesses={listings} compact />
      </section>

      <section className="page-section">
        <RiderTools areas={rideAreas} listings={listings} />
      </section>
    </main>
  );
}
