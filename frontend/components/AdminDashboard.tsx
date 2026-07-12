"use client";

import { FormEvent, useMemo, useState } from "react";
import { AdminEventsPanel } from "./AdminEventsPanel";
import {
  approveBusiness,
  deleteAdminBusiness,
  geocodeLocation,
  getAdminAnalytics,
  getAdminBusinesses,
  getAdminMarketingLeads,
  getAdminPrintifyProducts,
  getAdminBookingTransfers,
  getAdminRiders,
  getAdminServiceRequests,
  getAdminStoreOrders,
  getAdminTrailConditionReports,
  getAdminTrailTalkPosts,
  getAdminTrailReviews,
  moderateBusiness,
  moderateTrailConditionReport,
  moderateTrailTalkPost,
  moderateTrailReview,
  processAdminBookingTransfers,
  restoreAdminBusiness,
  sendAdminDirectTestEmail,
  sendAdminTestEmail,
  sendAdminTestSms,
  setBusinessFeatured,
  updateAdminBusiness,
  updateMarketingLeadStatus,
  updateServiceRequestStatus,
} from "../lib/api";
import type {
  AdminAnalytics,
  AdminRiderAccount,
  Business,
  BusinessUpdateInput,
  BookingTransfer,
  LodgingServiceRequest,
  MarketingLead,
  StoreOrder,
  TrailConditionReport,
  TrailReview,
  TrailTalkPost,
} from "../lib/types";

type Props = {
  initialBusinesses?: Business[];
};

function statusLabel(business: Business) {
  if (business.is_deleted) return "Deleted";
  if (business.listing_status !== "approved") {
    return business.listing_status.replaceAll("_", " ");
  }
  if (business.is_featured) return "Featured";
  return "Approved";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mapPoint(latitude: number, longitude: number) {
  const x = ((longitude + 125) / 59) * 100;
  const y = ((50 - latitude) / 26) * 100;
  return {
    left: `${clamp(x, 4, 96)}%`,
    top: `${clamp(y, 6, 94)}%`,
  };
}

function formatCents(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function parseStoreOrderItems(items: string) {
  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString();
}

export function AdminDashboard({ initialBusinesses = [] }: Props) {
  const [businesses, setBusinesses] = useState(initialBusinesses);
  const [pendingReviews, setPendingReviews] = useState<TrailReview[]>([]);
  const [pendingConditionReports, setPendingConditionReports] = useState<TrailConditionReport[]>([]);
  const [pendingTrailTalkPosts, setPendingTrailTalkPosts] = useState<TrailTalkPost[]>([]);
  const [serviceRequests, setServiceRequests] = useState<LodgingServiceRequest[]>([]);
  const [marketingLeads, setMarketingLeads] = useState<MarketingLead[]>([]);
  const [bookingTransfers, setBookingTransfers] = useState<BookingTransfer[]>([]);
  const [storeOrders, setStoreOrders] = useState<StoreOrder[]>([]);
  const [riderAccounts, setRiderAccounts] = useState<AdminRiderAccount[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(initialBusinesses.length > 0);
  const [isLoading, setIsLoading] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<BusinessUpdateInput>({});
  const [showDeletedBusinesses, setShowDeletedBusinesses] = useState(false);
  const [error, setError] = useState("");
  const [geocodeStatus, setGeocodeStatus] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [emailDiagnostic, setEmailDiagnostic] = useState("");
  const [emailStatusType, setEmailStatusType] = useState<"success" | "error">("success");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [sendingDirectTestEmail, setSendingDirectTestEmail] = useState(false);
  const [syncingPrintifyProducts, setSyncingPrintifyProducts] = useState(false);
  const [smsStatus, setSmsStatus] = useState("");
  const [smsPhone, setSmsPhone] = useState("");
  const [smsAudience, setSmsAudience] = useState<"rider" | "business">("rider");
  const [sendingTestSms, setSendingTestSms] = useState(false);

  const stats = useMemo(
    () => ({
      pending: businesses.filter((business) => !business.is_deleted && !business.is_approved).length,
      approved: businesses.filter((business) => !business.is_deleted && business.is_approved).length,
      needsChanges: businesses.filter((business) => !business.is_deleted && business.listing_status === "needs_changes").length,
      deleted: businesses.filter((business) => business.is_deleted).length,
    }),
    [businesses],
  );

  const storeItemRequests = marketingLeads.filter((lead) => lead.source === "store_vendor_request");
  const generalMarketingLeads = marketingLeads.filter((lead) => lead.source !== "store_vendor_request");

  function replaceBusiness(updatedBusiness: Business) {
    setBusinesses((current) =>
      current.map((business) =>
        business.id === updatedBusiness.id ? updatedBusiness : business,
      ),
    );
  }

  function removeBusiness(businessId: number) {
    setBusinesses((current) => current.filter((business) => business.id !== businessId));
  }

  async function reloadAdminBusinesses(includeDeleted = showDeletedBusinesses) {
    const loadedBusinesses = await getAdminBusinesses(adminPassword, includeDeleted);
    setBusinesses(loadedBusinesses);
  }

  async function unlockAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const loadedBusinesses = await getAdminBusinesses(adminPassword, showDeletedBusinesses);
      const loadedReviews = await getAdminTrailReviews(adminPassword);
      const loadedConditionReports = await getAdminTrailConditionReports(adminPassword);
      const loadedTrailTalkPosts = await getAdminTrailTalkPosts(adminPassword);
      const loadedServiceRequests = await getAdminServiceRequests(adminPassword);
      const loadedMarketingLeads = await getAdminMarketingLeads(adminPassword);
      const loadedBookingTransfers = await getAdminBookingTransfers(adminPassword);
      const loadedStoreOrders = await getAdminStoreOrders(adminPassword);
      const loadedRiderAccounts = await getAdminRiders(adminPassword);
      const loadedAnalytics = await getAdminAnalytics(adminPassword).catch(() => null);
      setBusinesses(loadedBusinesses);
      setPendingReviews(loadedReviews);
      setPendingConditionReports(loadedConditionReports);
      setPendingTrailTalkPosts(loadedTrailTalkPosts);
      setServiceRequests(loadedServiceRequests);
      setMarketingLeads(loadedMarketingLeads);
      setBookingTransfers(loadedBookingTransfers);
      setStoreOrders(loadedStoreOrders);
      setRiderAccounts(loadedRiderAccounts);
      setAnalytics(loadedAnalytics);
      setIsUnlocked(true);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to unlock admin.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function startEditing(business: Business) {
    setEditingId(business.id);
    setEditForm({
      name: business.name,
      description: business.description,
      phone: business.phone,
      owner_email: business.owner_email || "",
      owner_passcode: "",
      location: business.location,
      latitude: business.latitude,
      longitude: business.longitude,
      website_url: business.website_url,
      photo_url: business.photo_url,
    });
    setError("");
    setGeocodeStatus("");
  }

  async function saveAdminEdit(event: FormEvent<HTMLFormElement>, businessId: number) {
    event.preventDefault();
    setError("");
    setWorkingId(businessId);
    try {
      const payload = { ...editForm };
      if (!payload.owner_passcode?.trim()) {
        delete payload.owner_passcode;
      }
      replaceBusiness(await updateAdminBusiness(businessId, payload, adminPassword));
      setEditingId(null);
      setEditForm({});
      setGeocodeStatus("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to edit business.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function deleteRejectedBusiness(business: Business) {
    const canDelete = !business.is_approved && ["rejected", "unpublished"].includes(business.listing_status);
    if (!canDelete) {
      setError("Only rejected or unpublished businesses can be deleted.");
      return;
    }
    const confirmed = window.confirm(
      `Move ${business.name} to deleted businesses? You can show deleted businesses and restore it later.`,
    );
    if (!confirmed) return;

    setError("");
    setWorkingId(business.id);
    try {
      const deletedBusiness = await deleteAdminBusiness(business.id, adminPassword);
      if (showDeletedBusinesses) {
        replaceBusiness(deletedBusiness);
      } else {
        removeBusiness(business.id);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete business.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function restoreDeletedBusiness(business: Business) {
    setError("");
    setWorkingId(business.id);
    try {
      replaceBusiness(await restoreAdminBusiness(business.id, adminPassword));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to restore business.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function toggleDeletedBusinesses(checked: boolean) {
    setShowDeletedBusinesses(checked);
    if (!isUnlocked) return;
    setError("");
    setIsLoading(true);
    try {
      await reloadAdminBusinesses(checked);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to reload businesses.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function sendTestApprovalEmail() {
    setError("");
    setEmailStatus("");
    setEmailDiagnostic("");
    setEmailStatusType("success");
    setSendingTestEmail(true);

    try {
      const result = await sendAdminTestEmail(adminPassword);
      setEmailStatusType(result.sent ? "success" : "error");
      setEmailStatus(
        result.sent
          ? `Test email sent to ${result.to} from ${result.from}.`
          : `Test email failed: ${result.message}. To: ${result.to}. From: ${result.from}.`,
      );
      if (result.resend_key) {
        const details = [
          result.payload ? `Payload: ${JSON.stringify(result.payload)}.` : "",
          `Resend key: length ${result.resend_key.length}, starts ${result.resend_key.starts}, ends ${result.resend_key.ends}, sha256 ${result.resend_key.sha256}, trimmed spaces ${result.resend_key.has_spaces ? "yes" : "no"}.`,
        ].filter(Boolean);
        setEmailDiagnostic(
          details.join(" "),
        );
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to send test email.",
      );
    } finally {
      setSendingTestEmail(false);
    }
  }

  async function sendDirectResendTestEmail() {
    setError("");
    setEmailStatus("");
    setEmailDiagnostic("");
    setEmailStatusType("success");
    setSendingDirectTestEmail(true);

    try {
      const result = await sendAdminDirectTestEmail(adminPassword);
      setEmailStatusType(result.sent ? "success" : "error");
      setEmailStatus(
        result.sent
          ? `Direct Resend test sent to ${result.to} from ${result.from}.`
          : `Direct Resend test failed: ${result.message}. To: ${result.to}. From: ${result.from}.`,
      );

      const details = [
        result.payload ? `Payload: ${JSON.stringify(result.payload)}.` : "",
        result.response_status ? `Resend status: ${result.response_status}.` : "",
        result.response_body ? `Resend body: ${result.response_body}.` : "",
        result.resend_key
          ? `Resend key: length ${result.resend_key.length}, starts ${result.resend_key.starts}, ends ${result.resend_key.ends}, sha256 ${result.resend_key.sha256}, trimmed spaces ${result.resend_key.has_spaces ? "yes" : "no"}.`
          : "",
      ].filter(Boolean);
      setEmailDiagnostic(details.join(" "));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to send direct test email.",
      );
    } finally {
      setSendingDirectTestEmail(false);
    }
  }

  async function syncPrintifyProducts() {
    setError("");
    setEmailStatus("");
    setEmailDiagnostic("");
    setEmailStatusType("success");
    setSyncingPrintifyProducts(true);

    try {
      const result = await getAdminPrintifyProducts(adminPassword);
      setEmailStatusType(result.configured && result.count > 0 ? "success" : "error");
      setEmailStatus(result.message || `Loaded ${result.count} Printify products.`);
      if (result.products.length) {
        const preview = result.products
          .slice(0, 4)
          .map((product) => `${product.name} (${product.variants.length} variants)`)
          .join("; ");
        setEmailDiagnostic(`Printify preview: ${preview}${result.products.length > 4 ? "..." : ""}`);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to sync Printify products.",
      );
    } finally {
      setSyncingPrintifyProducts(false);
    }
  }

  async function sendTestSms(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSmsStatus("");
    setSendingTestSms(true);

    try {
      const result = await sendAdminTestSms(smsPhone, smsAudience, adminPassword);
      setSmsStatus(
        result.sent
          ? `Test SMS sent to ${result.to}.`
          : `Test SMS failed: ${result.message}. To: ${result.to}.`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to send test SMS.",
      );
    } finally {
      setSendingTestSms(false);
    }
  }

  async function findAdminCoordinates() {
    setError("");
    setGeocodeStatus("");
    if (!editForm.location?.trim()) {
      setError("Enter a location or address before finding coordinates.");
      return;
    }

    setGeocodeStatus("Finding coordinates...");
    try {
      const result = await geocodeLocation(editForm.location.trim());
      setEditForm({
        ...editForm,
        latitude: result.latitude,
        longitude: result.longitude,
      });
      setGeocodeStatus(`Pinned near ${result.display_name}.`);
    } catch (caughtError) {
      setGeocodeStatus("");
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to find coordinates for that location.",
      );
    }
  }

  async function runAction(
    businessId: number,
    action: () => Promise<Business>,
  ) {
    setError("");
    setWorkingId(businessId);
    try {
      replaceBusiness(await action());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update business.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function runReviewAction(reviewId: number, status: "approved" | "rejected") {
    setError("");
    setWorkingId(reviewId);
    try {
      await moderateTrailReview(reviewId, status, adminPassword);
      setPendingReviews((current) => current.filter((review) => review.id !== reviewId));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to moderate review.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function runConditionReportAction(reportId: number, status: "approved" | "rejected") {
    setError("");
    setWorkingId(reportId);
    try {
      await moderateTrailConditionReport(reportId, status, adminPassword);
      setPendingConditionReports((current) => current.filter((report) => report.id !== reportId));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to moderate condition report.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function runTrailTalkAction(postId: number, status: "approved" | "rejected") {
    setError("");
    setWorkingId(postId);
    try {
      await moderateTrailTalkPost(postId, status, adminPassword);
      setPendingTrailTalkPosts((current) => current.filter((post) => post.id !== postId));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to moderate Trail Talk post.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function runServiceAction(
    requestId: number,
    status: "contacted" | "matched" | "closed",
  ) {
    setError("");
    setWorkingId(requestId);
    try {
      await updateServiceRequestStatus(requestId, status, adminPassword);
      setServiceRequests((current) => current.filter((request) => request.id !== requestId));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update lodging service request.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function runLeadAction(
    leadId: number,
    status: "contacted" | "converted" | "closed",
  ) {
    setError("");
    setWorkingId(leadId);
    try {
      const updatedLead = await updateMarketingLeadStatus(leadId, status, adminPassword);
      setMarketingLeads((current) => current.filter((lead) => lead.id !== leadId));
      setEmailStatusType(updatedLead.email_sent ? "success" : "error");
      setEmailStatus(
        updatedLead.email_sent
          ? `Lead marked ${status}. Email sent to ${updatedLead.email}.`
          : `Lead marked ${status}. Email was not sent: ${updatedLead.email_message || "email service not configured"}.`,
      );
      setSmsStatus(
        updatedLead.sms_sent
          ? `SMS sent to ${updatedLead.phone}.`
          : `SMS was not sent: ${updatedLead.sms_message || "SMS service not configured or no phone number"}.`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update marketing lead.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  if (!isUnlocked) {
    return (
      <section className="admin-shell">
        <form className="dashboard-card admin-login-card" onSubmit={unlockAdmin}>
          <label>
            Admin password
            <input
              required
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              placeholder="Enter admin password"
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Unlocking..." : "Unlock Admin"}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <div className="admin-stats">
        <article>
          <strong>{stats.pending}</strong>
          <span>Pending</span>
        </article>
        <article>
          <strong>{stats.approved}</strong>
          <span>Approved</span>
        </article>
        <article>
          <strong>{stats.needsChanges}</strong>
          <span>Needs Changes</span>
        </article>
        {showDeletedBusinesses ? (
          <article>
            <strong>{stats.deleted}</strong>
            <span>Deleted</span>
          </article>
        ) : null}
        <article>
          <strong>
            {pendingReviews.length +
              pendingTrailTalkPosts.length +
              serviceRequests.length +
              generalMarketingLeads.length +
              storeItemRequests.length +
              bookingTransfers.length}
          </strong>
          <span>Queues</span>
        </article>
      </div>
      <AdminEventsPanel adminPassword={adminPassword} />

      {analytics ? (
        <section className="dashboard-card admin-analytics-card">
          <div className="section-heading">
            <p>Launch analytics</p>
            <h2>Riders, visits, and hometowns</h2>
          </div>
          <div className="admin-analytics-stats">
            <div>
              <strong>{analytics.rider_count}</strong>
              <span>Riders joined</span>
            </div>
            <div>
              <strong>{analytics.page_visits}</strong>
              <span>Page visits</span>
            </div>
            <div>
              <strong>{analytics.business_count}</strong>
              <span>Businesses</span>
            </div>
            <div>
              <strong>{analytics.connected_stripe_accounts}</strong>
              <span>Connected Stripe Accounts</span>
            </div>
            <div>
              <strong>{analytics.not_connected_stripe_accounts}</strong>
              <span>Not Connected</span>
            </div>
            <div>
              <strong>{analytics.pending_verification_stripe_accounts}</strong>
              <span>Pending Verification</span>
            </div>
            <div>
              <strong>{formatCents(analytics.gross_booking_volume_cents)}</strong>
              <span>Gross Booking Volume</span>
            </div>
            <div>
              <strong>{analytics.bookings_count}</strong>
              <span>Bookings</span>
            </div>
            <div>
              <strong>{analytics.failed_payments_count}</strong>
              <span>Failed Payments</span>
            </div>
          </div>
          <p className="field-help">
            Booking platform fees are disabled. Lodging businesses process reservations
            through their own connected Stripe accounts.
          </p>
          <div className="admin-analytics-layout">
            <div className="admin-location-map" aria-label="Rider hometown map">
              {analytics.rider_locations.length ? (
                analytics.rider_locations.map((location) => (
                  <span
                    className="admin-location-pin"
                    key={`${location.label}-${location.latitude}-${location.longitude}`}
                    style={mapPoint(location.latitude, location.longitude)}
                    title={`${location.label}: ${location.riders} rider${location.riders === 1 ? "" : "s"}`}
                  >
                    {location.riders}
                  </span>
                ))
              ) : (
                <p>No rider hometowns captured yet.</p>
              )}
            </div>
            <div className="admin-top-paths">
              <h3>Top pages</h3>
              {analytics.top_paths.length ? (
                analytics.top_paths.map((path) => (
                  <div key={path.path}>
                    <span>{path.path}</span>
                    <strong>{path.visits}</strong>
                  </div>
                ))
              ) : (
                <p>No page visits tracked yet.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <div className="admin-review-queue">
        <div className="section-heading">
          <p>Rider accounts</p>
          <h2>Profiles saved in the app</h2>
        </div>
        {riderAccounts.length ? (
          <div className="admin-list">
            {riderAccounts.map((rider) => (
              <article className="admin-business-card" key={rider.id}>
                <div>
                  <div className="listing-meta">
                    <span>{rider.veteran_verification_status}</span>
                    <span>joined {formatDate(rider.created_at)}</span>
                  </div>
                  <h2>{rider.display_name || rider.email}</h2>
                  <p>
                    {rider.home_location || "No hometown saved"} - {rider.completed_trails} completed,
                    {" "}
                    {rider.saved_trails} saved, {rider.badge_count} badges.
                  </p>
                  <dl>
                    <div>
                      <dt>Email</dt>
                      <dd>{rider.email}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{rider.phone || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt>Partner visits</dt>
                      <dd>{rider.partner_visits}</dd>
                    </div>
                    <div>
                      <dt>Profile</dt>
                      <dd>
                        <a href={`/rider/access/${rider.access_token}`}>Open ride card</a>
                      </dd>
                    </div>
                  </dl>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">No rider accounts found yet.</p>
        )}
      </div>

      <div className="admin-email-tools">
        <button type="button" disabled={sendingTestEmail} onClick={sendTestApprovalEmail}>
          {sendingTestEmail ? "Sending..." : "Send Test Approval Email"}
        </button>
        <button type="button" disabled={sendingDirectTestEmail} onClick={sendDirectResendTestEmail}>
          {sendingDirectTestEmail ? "Sending..." : "Send Direct Resend Test"}
        </button>
        <button type="button" disabled={syncingPrintifyProducts} onClick={syncPrintifyProducts}>
          {syncingPrintifyProducts ? "Syncing..." : "Sync Printify Products"}
        </button>
        <span>Test email delivery or confirm the backend can read your Printify catalog.</span>
      </div>
      <form className="admin-email-tools admin-sms-tools" onSubmit={sendTestSms}>
        <input
          required
          value={smsPhone}
          onChange={(event) => setSmsPhone(event.target.value)}
          placeholder="(606) 555-0199"
        />
        <select
          value={smsAudience}
          onChange={(event) => setSmsAudience(event.target.value as "rider" | "business")}
        >
          <option value="rider">Rider</option>
          <option value="business">Business</option>
        </select>
        <button type="submit" disabled={sendingTestSms}>
          {sendingTestSms ? "Sending..." : "Send Test SMS"}
        </button>
        <span>Uses Twilio SMS settings for rider and business texts.</span>
      </form>

      {error ? <p className="form-error">{error}</p> : null}
      {emailStatus ? (
        <p className={emailStatusType === "success" ? "form-success" : "form-error"}>
          {emailStatus}
        </p>
      ) : null}
      {emailDiagnostic ? <p className="form-success">{emailDiagnostic}</p> : null}
      {smsStatus ? <p className="form-success">{smsStatus}</p> : null}
      {geocodeStatus ? <p className="form-success">{geocodeStatus}</p> : null}

      <div className="admin-review-queue">
        <div className="section-heading">
          <p>Store orders</p>
          <h2>Merch checkout and Printify status</h2>
        </div>
        {storeOrders.length ? (
          <div className="admin-list">
            {storeOrders.map((order) => {
              const items = parseStoreOrderItems(order.items);
              return (
                <article className="admin-business-card" key={order.id}>
                  <div>
                    <div className="listing-meta">
                      <span>{order.status}</span>
                      <span>{order.printify_submitted ? "Printify submitted" : "Printify needs attention"}</span>
                    </div>
                    <h2>{order.customer_name || order.customer_email || `Order #${order.id}`}</h2>
                    <p>
                      {formatCents(order.total_cents, order.currency)} paid through Stripe.
                      {" "}
                      {order.printify_message || "No Printify message recorded yet."}
                    </p>
                    <dl>
                      <div>
                        <dt>Email</dt>
                        <dd>{order.customer_email || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt>Phone</dt>
                        <dd>{order.customer_phone || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt>Stripe session</dt>
                        <dd>{order.stripe_checkout_session_id}</dd>
                      </div>
                      <div>
                        <dt>Printify order</dt>
                        <dd>{order.printify_order_id || "Not created"}</dd>
                      </div>
                    </dl>
                    {items.length ? (
                      <div className="admin-order-items">
                        {items.map((item, index) => (
                          <p key={`${order.id}-${index}`}>
                            <strong>{item.name || "Store item"}</strong>
                            {" "}
                            x{item.quantity || 1}
                            {item.variant ? ` - ${item.variant}` : ""}
                            {item.dropship_sku ? ` - SKU ${item.dropship_sku}` : ""}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">No merch orders recorded yet.</p>
        )}
      </div>

      <div className="admin-review-queue">
        <div className="section-heading">
          <p>Store item requests</p>
          <h2>Businesses asking to sell gear</h2>
        </div>
        {storeItemRequests.length ? (
          <div className="admin-list">
            {storeItemRequests.map((lead) => (
              <article className="admin-business-card" key={lead.id}>
                <div>
                  <div className="listing-meta">
                    <span>{lead.status}</span>
                    <span>{lead.area || "store seller"}</span>
                  </div>
                  <h2>{lead.business_name || lead.email}</h2>
                  <p>{lead.notes || "No item details provided."}</p>
                  <dl>
                    <div>
                      <dt>Email</dt>
                      <dd>{lead.email}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{lead.phone || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt>Website</dt>
                      <dd>{lead.website || "Not provided"}</dd>
                    </div>
                  </dl>
                </div>
                <div className="admin-actions">
                  <button
                    type="button"
                    disabled={workingId === lead.id}
                    onClick={() => runLeadAction(lead.id, "converted")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={workingId === lead.id}
                    onClick={() => runLeadAction(lead.id, "closed")}
                  >
                    Deny
                  </button>
                  <button
                    type="button"
                    disabled={workingId === lead.id}
                    onClick={() => runLeadAction(lead.id, "contacted")}
                  >
                    Contacted
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">No business store item requests are waiting.</p>
        )}
      </div>

      <div className="admin-email-tools">
        <label className="admin-toggle-row">
          <input
            type="checkbox"
            checked={showDeletedBusinesses}
            onChange={(event) => toggleDeletedBusinesses(event.target.checked)}
          />
          Show deleted businesses
        </label>
        <span>Deleted businesses stay hidden from riders unless restored and approved again.</span>
      </div>

      <div className="admin-review-queue">
        <div className="section-heading">
          <p>Legacy booking payouts</p>
          <h2>Old transfer records and payout issues</h2>
        </div>
        <div className="admin-email-tools">
          <button
            type="button"
            onClick={async () => {
              setError("");
              setEmailStatus("");
              setEmailStatusType("success");
              try {
                const result = await processAdminBookingTransfers(adminPassword);
                setEmailStatusType(result.failed || result.missing_connect_account ? "error" : "success");
                setEmailStatus(
                  `Payout job ran. Due: ${result.due}. Processed: ${result.processed}. Missing Connect: ${result.missing_connect_account}. Failed: ${result.failed}.`,
                );
                setBookingTransfers(await getAdminBookingTransfers(adminPassword));
              } catch (caughtError) {
                setError(
                  caughtError instanceof Error
                    ? caughtError.message
                    : "Unable to process booking payouts.",
                );
              }
            }}
          >
            Process Due Payouts
          </button>
          <span>
            New reservations use platform checkout with Stripe Connect provider
            payouts. This queue is only for older transfer records that still need attention.
          </span>
        </div>
        {bookingTransfers.length ? (
          <div className="admin-list">
            {bookingTransfers.map((transfer) => (
              <article className="admin-business-card" key={transfer.id}>
                <div>
                  <div className="listing-meta">
                    <span>{transfer.status.replaceAll("_", " ")}</span>
                    <span>release {transfer.release_date || "not set"}</span>
                  </div>
                  <h2>Booking #{transfer.booking_id}</h2>
                  <p>
                    Business #{transfer.business_id} payout{" "}
                    {`$${(transfer.amount_cents / 100).toFixed(2)}`}
                  </p>
                  <dl>
                    <div>
                      <dt>Transfer</dt>
                      <dd>{transfer.stripe_transfer_id || "Not sent yet"}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{transfer.status.replaceAll("_", " ")}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">No payout items need attention.</p>
        )}
      </div>

      <div className="admin-review-queue">
        <div className="section-heading">
          <p>Inbound leads</p>
          <h2>Launch and business signups</h2>
        </div>
        {generalMarketingLeads.length ? (
          <div className="admin-list">
            {generalMarketingLeads.map((lead) => (
              <article className="admin-business-card" key={lead.id}>
                <div>
                  <div className="listing-meta">
                    <span>{lead.lead_type.replaceAll("_", " ")}</span>
                    <span>{lead.area || lead.source || "new lead"}</span>
                  </div>
                  <h2>{lead.business_name || lead.email}</h2>
                  <p>{lead.notes || "No notes provided."}</p>
                  <dl>
                    <div>
                      <dt>Email</dt>
                      <dd>{lead.email}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{lead.phone || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt>Category</dt>
                      <dd>{lead.category || "Launch access"}</dd>
                    </div>
                    <div>
                      <dt>Website</dt>
                      <dd>{lead.website || "Not provided"}</dd>
                    </div>
                  </dl>
                </div>
                <div className="admin-actions">
                  <button
                    type="button"
                    disabled={workingId === lead.id}
                    onClick={() => runLeadAction(lead.id, "contacted")}
                  >
                    Contacted
                  </button>
                  <button
                    type="button"
                    disabled={workingId === lead.id}
                    onClick={() => runLeadAction(lead.id, "converted")}
                  >
                    Converted
                  </button>
                  <button
                    type="button"
                    disabled={workingId === lead.id}
                    onClick={() => runLeadAction(lead.id, "closed")}
                  >
                    Close
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">No new launch or business leads.</p>
        )}
      </div>

      <div className="admin-review-queue">
        <div className="section-heading">
          <p>Review queue</p>
          <h2>Pending trail reviews</h2>
        </div>
        {pendingReviews.length ? (
          <div className="admin-list">
            {pendingReviews.map((review) => (
              <article className="admin-business-card" key={review.id}>
                <div>
                  <div className="listing-meta">
                    <span>{review.areaSlug.replaceAll("-", " ")}</span>
                    <span>{review.rating} stars</span>
                  </div>
                  <h2>{review.riderName}</h2>
                  {review.photoUrl ? (
                    <figure className="admin-review-photo">
                      <img alt={review.photoCaption || `${review.riderName} trail photo`} src={review.photoUrl} />
                      {review.photoCaption ? <figcaption>{review.photoCaption}</figcaption> : null}
                    </figure>
                  ) : null}
                  <p>{review.comment}</p>
                  <dl>
                    <div>
                      <dt>Machine</dt>
                      <dd>{review.machine}</dd>
                    </div>
                    <div>
                      <dt>Difficulty</dt>
                      <dd>{review.difficulty}</dd>
                    </div>
                    <div>
                      <dt>Condition</dt>
                      <dd>{review.trailCondition}</dd>
                    </div>
                  </dl>
                </div>
                <div className="admin-actions">
                  <button
                    type="button"
                    disabled={workingId === review.id}
                    onClick={() => runReviewAction(review.id, "approved")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={workingId === review.id}
                    onClick={() => runReviewAction(review.id, "rejected")}
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">No pending trail reviews.</p>
        )}
      </div>

      <div className="admin-review-queue">
        <div className="section-heading">
          <p>Condition queue</p>
          <h2>Pending map condition reports</h2>
        </div>
        {pendingConditionReports.length ? (
          <div className="admin-list">
            {pendingConditionReports.map((report) => (
              <article className="admin-business-card" key={report.id}>
                <div>
                  <div className="listing-meta">
                    <span>{report.areaSlug.replaceAll("-", " ")}</span>
                    <span>{report.severity}</span>
                  </div>
                  <h2>{report.reportType.replaceAll("_", " ")}</h2>
                  <p>{report.note || "No rider note provided."}</p>
                  <dl>
                    <div>
                      <dt>Trail</dt>
                      <dd>{report.trailName || "Whole area"}</dd>
                    </div>
                    <div>
                      <dt>Rider</dt>
                      <dd>{report.riderName || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt>Pin</dt>
                      <dd>
                        {typeof report.latitude === "number" && typeof report.longitude === "number"
                          ? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`
                          : "Uses trail fallback"}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="admin-actions">
                  <button
                    type="button"
                    disabled={workingId === report.id}
                    onClick={() => runConditionReportAction(report.id, "approved")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={workingId === report.id}
                    onClick={() => runConditionReportAction(report.id, "rejected")}
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">No pending condition reports.</p>
        )}
      </div>

      <div className="admin-review-queue">
        <div className="section-heading">
          <p>Community queue</p>
          <h2>Pending Trail Talk posts</h2>
        </div>
        {pendingTrailTalkPosts.length ? (
          <div className="admin-list">
            {pendingTrailTalkPosts.map((post) => (
              <article className="admin-business-card" key={post.id}>
                <div>
                  <div className="listing-meta">
                    <span>{post.category.replaceAll("_", " ")}</span>
                    <span>{post.area_slug ? post.area_slug.replaceAll("-", " ") : "all areas"}</span>
                  </div>
                  <h2>{post.title}</h2>
                  <p>{post.message}</p>
                  <dl>
                    <div>
                      <dt>Rider</dt>
                      <dd>{post.rider_name}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{post.email || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt>Ride date</dt>
                      <dd>{post.ride_date || "Not set"}</dd>
                    </div>
                  </dl>
                </div>
                <div className="admin-actions">
                  <button
                    type="button"
                    disabled={workingId === post.id}
                    onClick={() => runTrailTalkAction(post.id, "approved")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={workingId === post.id}
                    onClick={() => runTrailTalkAction(post.id, "rejected")}
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">No pending Trail Talk posts.</p>
        )}
      </div>

      <div className="admin-review-queue">
        <div className="section-heading">
          <p>Lodging services</p>
          <h2>Cleaner and turnover requests</h2>
        </div>
        {serviceRequests.length ? (
          <div className="admin-list">
            {serviceRequests.map((request) => (
              <article className="admin-business-card" key={request.id}>
                <div>
                  <div className="listing-meta">
                    <span>{request.service_type}</span>
                    <span>{request.status}</span>
                  </div>
                  <h2>{request.property_name || "Lodging property"}</h2>
                  <p>{request.notes || "No notes provided."}</p>
                  <dl>
                    <div>
                      <dt>Location</dt>
                      <dd>{request.property_location}</dd>
                    </div>
                    <div>
                      <dt>Date</dt>
                      <dd>{request.date_needed || "Flexible"}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{request.contact_phone}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{request.contact_email}</dd>
                    </div>
                  </dl>
                </div>
                <div className="admin-actions">
                  <button
                    type="button"
                    disabled={workingId === request.id}
                    onClick={() => runServiceAction(request.id, "contacted")}
                  >
                    Contacted
                  </button>
                  <button
                    type="button"
                    disabled={workingId === request.id}
                    onClick={() => runServiceAction(request.id, "matched")}
                  >
                    Matched
                  </button>
                  <button
                    type="button"
                    disabled={workingId === request.id}
                    onClick={() => runServiceAction(request.id, "closed")}
                  >
                    Close
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">No new lodging service requests.</p>
        )}
      </div>

      <div className="admin-list">
        {businesses.map((business) => (
          <article className="admin-business-card" key={business.id}>
            {editingId === business.id ? (
              <form onSubmit={(event) => saveAdminEdit(event, business.id)}>
                <label>
                  Name
                  <input
                    required
                    value={editForm.name || ""}
                    onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                  />
                </label>
                <label>
                  Phone
                  <input
                    required
                    value={editForm.phone || ""}
                    onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })}
                  />
                </label>
                <label>
                  Owner login email
                  <input
                    type="email"
                    value={editForm.owner_email || ""}
                    onChange={(event) => setEditForm({ ...editForm, owner_email: event.target.value })}
                  />
                </label>
                <label>
                  New login password
                  <input
                    autoComplete="new-password"
                    minLength={4}
                    placeholder="Leave blank to keep current password"
                    type="password"
                    value={editForm.owner_passcode || ""}
                    onChange={(event) => setEditForm({ ...editForm, owner_passcode: event.target.value })}
                  />
                </label>
                <label>
                  Location
                  <input
                    required
                    value={editForm.location || ""}
                    onChange={(event) => setEditForm({ ...editForm, location: event.target.value })}
                  />
                </label>
                <div className="coordinate-grid">
                  <label>
                    Latitude
                    <input
                      inputMode="decimal"
                      placeholder="37.6223"
                      value={editForm.latitude ?? ""}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          latitude: event.target.value === "" ? undefined : Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Longitude
                    <input
                      inputMode="decimal"
                      placeholder="-82.1571"
                      value={editForm.longitude ?? ""}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          longitude: event.target.value === "" ? undefined : Number(event.target.value),
                        })
                      }
                    />
                  </label>
                </div>
                <button className="secondary-action" type="button" onClick={findAdminCoordinates}>
                  Find Coordinates From Location
                </button>
                <label>
                  Website
                  <input
                    value={editForm.website_url || ""}
                    onChange={(event) => setEditForm({ ...editForm, website_url: event.target.value })}
                  />
                </label>
                <label>
                  Photo URL
                  <input
                    required
                    value={editForm.photo_url || ""}
                    onChange={(event) => setEditForm({ ...editForm, photo_url: event.target.value })}
                  />
                </label>
                <label>
                  Description
                  <textarea
                    required
                    value={editForm.description || ""}
                    onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
                  />
                </label>
                <div className="admin-actions">
                  <button type="submit" disabled={workingId === business.id}>
                    Save Edits
                  </button>
                  <button type="button" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
            <div>
              <div className="listing-meta">
                <span>{business.category}</span>
                <span>{statusLabel(business)}</span>
              </div>
              <h2>{business.name}</h2>
              <p>{business.description}</p>
              <dl>
                <div>
                  <dt>Phone</dt>
                  <dd>{business.phone}</dd>
                </div>
                <div>
                  <dt>Owner email</dt>
                  <dd>{business.owner_email || "Not set"}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{business.location}</dd>
                </div>
                <div>
                  <dt>Map pin</dt>
                  <dd>
                    {business.latitude != null && business.longitude != null
                      ? `${business.latitude}, ${business.longitude}`
                      : "Not set"}
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{business.listing_status.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt>Subscription</dt>
                  <dd>{business.subscription_status.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt>Tier</dt>
                  <dd>{business.subscription_tier.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt>Clicks</dt>
                  <dd>{business.view_clicks + business.action_clicks}</dd>
                </div>
              </dl>
            </div>
            )}
            <div className="admin-actions">
              {business.is_deleted ? (
                <button
                  type="button"
                  disabled={workingId === business.id}
                  onClick={() => restoreDeletedBusiness(business)}
                >
                  Restore
                </button>
              ) : (
                <>
              <button
                type="button"
                disabled={workingId === business.id}
                onClick={() => startEditing(business)}
              >
                Edit
              </button>
              <button
                type="button"
                disabled={business.is_approved || workingId === business.id}
                onClick={() =>
                  runAction(business.id, () =>
                    approveBusiness(business.id, adminPassword),
                  )
                }
              >
                {business.is_approved ? "Approved" : "Approve"}
              </button>
              <button
                type="button"
                disabled={workingId === business.id}
                onClick={() =>
                  runAction(business.id, () =>
                    moderateBusiness(business.id, {
                      listing_status: "needs_changes",
                      admin_notes: "Please update the listing details before approval.",
                    }, adminPassword),
                  )
                }
              >
                Needs Changes
              </button>
              <button
                type="button"
                disabled={workingId === business.id}
                onClick={() =>
                  runAction(business.id, () =>
                    moderateBusiness(business.id, {
                      listing_status: "rejected",
                      admin_notes: "Listing rejected by admin.",
                    }, adminPassword),
                  )
                }
              >
                Reject
              </button>
              <button
                type="button"
                disabled={workingId === business.id}
                onClick={() =>
                  runAction(business.id, () =>
                    moderateBusiness(business.id, {
                      listing_status: "unpublished",
                      admin_notes: "Listing is currently unpublished.",
                    }, adminPassword),
                  )
                }
              >
                Unpublish
              </button>
              <button
                type="button"
                disabled={!business.is_approved || workingId === business.id}
                onClick={() =>
                  runAction(business.id, () =>
                    setBusinessFeatured(
                      business.id,
                      !business.is_featured,
                      adminPassword,
                    ),
                  )
                }
              >
                {business.is_featured ? "Unfeature" : "Mark Featured"}
              </button>
              {!business.is_approved && ["rejected", "unpublished"].includes(business.listing_status) ? (
                <button
                  type="button"
                  disabled={workingId === business.id}
                  onClick={() => deleteRejectedBusiness(business)}
                >
                  Delete
                </button>
              ) : null}
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
