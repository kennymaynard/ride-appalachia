export default function PrivacyPage() {
  const updatedAt = "July 9, 2026";

  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Privacy</p>
        <h1>Privacy Policy</h1>
        <p>
          Appalachia Offroad collects only the information needed to operate the
          marketplace, business portal, payments, reviews, and trip-planning experience.
        </p>
        <p className="field-help">Last updated: {updatedAt}</p>
      </section>

      <section className="legal-page" aria-label="Privacy policy sections">
        <aside className="legal-summary">
          <p className="eyebrow">Policy Overview</p>
          <h2>Your information, used to run the platform.</h2>
          <p>
            This policy explains what we collect, how we use it, when service
            providers help us process it, and how riders or businesses can
            request updates.
          </p>
          <div>
            <span>Contact</span>
            <a href="mailto:support@appalachiaoffroadapp.com">
              support@appalachiaoffroadapp.com
            </a>
          </div>
        </aside>

        <article>
          <h2>Information We Collect</h2>
          <p>
            We may collect business listing details, owner names or emails,
            phone numbers, websites, photos, locations, descriptions, deals,
            bookable item details, calendar links, service requests, rider
            account details, trip plans, saved stops, reviews, trail posts,
            customer booking information, support messages, and basic app usage
            activity.
          </p>
        </article>
        <article>
          <h2>How We Use Information</h2>
          <p>
            We use information to run the app, show listings and trail planning
            tools, manage rider and business accounts, process bookings,
            coordinate service requests, moderate reviews, send account access
            links, provide support, improve safety and usability, prevent abuse,
            and communicate about features, deals, updates, and marketplace
            activity when allowed.
          </p>
        </article>
        <article>
          <h2>Business Listings</h2>
          <p>
            Business names, categories, locations, public phone numbers,
            websites, photos, descriptions, deals, reviews, and selected booking
            details may be shown publicly in the app. Owner access tokens,
            internal notes, private dashboard details, and admin-only moderation
            details are not intended for public display.
          </p>
        </article>
        <article>
          <h2>Rider Accounts and Trips</h2>
          <p>
            Rider information may include email, phone number, display name,
            saved trips, selected stops, booking lookups, reviews, partner visit
            activity, badges, and communication preferences. Trip-planning data
            is used to provide saved plans and improve rider tools.
          </p>
        </article>
        <article>
          <h2>Mini Games and Rewards</h2>
          <p>
            Trail Runner and similar game experiences may store local progress,
            coins, upgrades, scores, run codes, reward interactions, and basic
            gameplay activity. This information is used to operate the game,
            support rewarded-ad flows, improve the experience, and help riders
            connect back to trip-planning tools.
          </p>
        </article>
        <article>
          <h2>Payments</h2>
          <p>
            Payments, subscriptions, checkout, connected accounts, payouts, and
            certain financial onboarding steps are processed by Stripe.
            Appalachia Offroad does not store full card numbers or bank account
            information. For lodging reservations and other bookable services,
            payment is collected through Appalachia Offroad using Stripe Connect,
            and the provider&apos;s connected account receives its payout. Stripe may collect
            payment, identity, tax, bank, and fraud-prevention information
            according to Stripe&apos;s own policies.
          </p>
        </article>
        <article>
          <h2>Provider Tax Responsibility</h2>
          <p>
            Lodging providers and other bookable businesses may enter tax rates,
            booking prices, cancellation terms, and related reservation details
            in the business dashboard. Providers are responsible for collecting,
            reporting, and remitting applicable sales, lodging, occupancy, and
            local taxes. Appalachia Offroad may store booking totals and tax
            line items for receipts, support, and marketplace records, but does
            not store provider bank information or remit taxes for providers.
          </p>
        </article>
        <article>
          <h2>Email, SMS, and Phone</h2>
          <p>
            We may use email, SMS, and phone numbers for account login links,
            confirmation codes, booking updates, service requests, support,
            business leads, and opted-in marketing. Marketing messages require
            consent where required. You may opt out of marketing messages, but
            transactional messages related to account access, bookings, support,
            safety, or payments may still be sent.
          </p>
        </article>
        <article>
          <h2>Reviews and Public Content</h2>
          <p>
            Reviews, trail posts, ratings, comments, photos, and similar content
            may be reviewed before publication and may appear publicly if
            approved. Do not submit private information, emergency details, or
            content you do not have permission to share.
          </p>
        </article>
        <article>
          <h2>Analytics and Cookies</h2>
          <p>
            We may use cookies, logs, click counts, page views, referral
            information, and similar technical data to keep the app working,
            understand which listings and tools are useful, measure partner
            activity, reduce spam, and improve performance. Browser settings may
            allow you to limit some cookies.
          </p>
        </article>
        <article>
          <h2>Service Providers</h2>
          <p>
            We may share necessary information with providers that help operate
            the app, including hosting, email delivery, SMS or phone services,
            payment processors, analytics, customer support, mapping, and
            security tools. These providers should use the information only to
            provide services to us or to you.
          </p>
        </article>
        <article>
          <h2>Business Contact Routing</h2>
          <p>
            Public support or business contact numbers may be provided through a
            separate phone service that forwards calls or messages to an
            operator or business owner. Call logs, message logs, voicemail, and
            related metadata may be handled by that phone provider according to
            its own terms.
          </p>
        </article>
        <article>
          <h2>Data Retention</h2>
          <p>
            We keep information as long as needed to operate the app, comply
            with legal and payment obligations, resolve disputes, prevent abuse,
            and maintain accurate marketplace records. Some information may be
            retained in backups or logs for a limited time after deletion.
          </p>
        </article>
        <article>
          <h2>Your Choices</h2>
          <p>
            You may request updates to business contact details, rider contact
            details, marketing preferences, or account information by contacting
            support. Businesses can update many listing and contact details from
            the business dashboard, and admins may update owner email or phone
            details when needed.
          </p>
        </article>
        <article>
          <h2>Security</h2>
          <p>
            We use reasonable safeguards to protect account and marketplace
            information, but no online service can guarantee complete security.
            Protect login links and confirmation codes, and contact support if
            you believe your account access was exposed.
          </p>
        </article>
        <article>
          <h2>Children</h2>
          <p>
            Appalachia Offroad is not intended for children under 13. Users who
            plan rides, make bookings, or manage business listings should be old
            enough to do so under applicable law and payment provider rules.
          </p>
        </article>
        <article>
          <h2>Support</h2>
          <p>
            Privacy questions, correction requests, or opt-out requests can be
            sent to support@appalachiaoffroadapp.com. We may update this policy
            as the app, providers, and features change.
          </p>
        </article>
      </section>
    </main>
  );
}
