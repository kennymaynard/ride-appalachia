import { BookingLookup } from "../../components/BookingLookup";

type Props = {
  searchParams: Promise<{
    booking_id?: string;
  }>;
};

export default async function BookingsPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Bookings</p>
        <h1>Manage your trip booking.</h1>
        <p>
          Look up your booking, review the cancellation policy, and send a
          cancellation request to the business if plans change.
        </p>
      </section>

      <BookingLookup initialBookingId={params.booking_id || ""} />
    </main>
  );
}
