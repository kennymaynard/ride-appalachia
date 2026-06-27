export default function PrivacyPage() {
  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Privacy</p>
        <h1>Privacy policy.</h1>
        <p>
          Appalachia Offroad collects only the information needed to operate the
          marketplace, business portal, payments, reviews, and trip-planning experience.
        </p>
      </section>

      <section className="legal-page">
        <article>
          <h2>Information We Collect</h2>
          <p>Business listing details, owner email addresses, submitted deals, trail reviews, and basic click activity.</p>
        </article>
        <article>
          <h2>Payments</h2>
          <p>Payments are processed by Stripe. Appalachia Offroad does not store card numbers.</p>
        </article>
        <article>
          <h2>Email</h2>
          <p>Business portal links may be sent by email. Email is used for account access and marketplace support.</p>
        </article>
        <article>
          <h2>Support</h2>
          <p>Privacy questions can be sent to support@appalachiaoffroadapp.com.</p>
        </article>
        <article>
          <h2>Reviews</h2>
          <p>Submitted trail reviews may be moderated before appearing publicly.</p>
        </article>
      </section>
    </main>
  );
}
