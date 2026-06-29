export default function RefundsPage() {
  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Refunds</p>
        <h1>Refund and cancellation policy.</h1>
        <p>
          Appalachia Offroad handles partner subscriptions, booking payments,
          cancellation requests, and marketplace support for riders and partner
          businesses.
        </p>
      </section>

      <section className="legal-page">
        <article>
          <h2>Partner Subscriptions</h2>
          <p>
            Paid partner subscriptions are marketplace subscriptions for listing
            visibility, coupons, and business dashboard access. Subscription
            payments are final and non-refundable once charged, unless a billing
            error is confirmed by Appalachia Offroad.
          </p>
        </article>
        <article>
          <h2>Booking Cancellations</h2>
          <p>
            Riders may request cancellation from their booking once a plan is
            booked. The request is sent to the partner business for review. The
            business decides whether to approve or decline the cancellation
            based on its posted cancellation window, property rules, and refund
            policy.
          </p>
        </article>
        <article>
          <h2>Refund Reviews</h2>
          <p>
            Each partner business may customize its cancellation and refund
            policy for each property, rental, guide service, event, or booking
            item. Approved cancellations may receive a full or partial refund.
            Late cancellations, no-shows, non-refundable fees, or custom
            property terms may reduce or prevent a refund.
          </p>
        </article>
        <article>
          <h2>Business Payout Timing</h2>
          <p>
            Booking funds are collected through the app and the business payout
            is scheduled for the day after check-in. This gives time for
            cancellation review, check-in confirmation, and support review when
            needed.
          </p>
        </article>
        <article>
          <h2>Delayed Customer Charge Option</h2>
          <p>
            A business may choose a policy where the customer is charged after
            the cancellation period instead of immediately at booking. That
            option depends on the booking setup, payment availability, and
            whether the rider completes checkout when payment is due.
          </p>
        </article>
        <article>
          <h2>Business Renewals</h2>
          <p>
            Businesses may cancel future subscription renewal. Service remains
            active through the already-paid monthly or yearly term, then ends
            after that term unless renewed.
          </p>
        </article>
        <article>
          <h2>Billing Errors</h2>
          <p>
            If you believe a charge was made in error, contact
            support@appalachiaoffroadapp.com so the account or booking can be
            reviewed.
          </p>
        </article>
      </section>
    </main>
  );
}
