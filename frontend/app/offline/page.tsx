import { OfflineTripPack } from "../../components/OfflineTripPack";

export default function OfflinePage() {
  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Offline mode</p>
        <h1>Your saved ride plan when service drops.</h1>
        <p>
          Save a trip pack from the planner before you ride. This page keeps the
          selected trails, places, phone numbers, links, and your own directions
          on this device.
        </p>
      </section>
      <OfflineTripPack />
    </main>
  );
}
