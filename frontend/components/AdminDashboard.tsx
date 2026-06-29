"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  approveBusiness,
  geocodeLocation,
  getAdminBusinesses,
  getAdminMarketingLeads,
  getAdminBookingTransfers,
  getAdminServiceRequests,
  getAdminTrailTalkPosts,
  getAdminTrailReviews,
  moderateBusiness,
  moderateTrailTalkPost,
  moderateTrailReview,
  processAdminBookingTransfers,
  sendAdminTestEmail,
  setBusinessFeatured,
  updateAdminBusiness,
  updateMarketingLeadStatus,
  updateServiceRequestStatus,
} from "../lib/api";
import type {
  Business,
  BusinessUpdateInput,
  BookingTransfer,
  LodgingServiceRequest,
  MarketingLead,
  TrailReview,
  TrailTalkPost,
} from "../lib/types";

type Props = {
  initialBusinesses?: Business[];
};

function statusLabel(business: Business) {
  if (business.listing_status !== "approved") {
    return business.listing_status.replaceAll("_", " ");
  }
  if (business.is_featured) return "Featured";
  return "Approved";
}

export function AdminDashboard({ initialBusinesses = [] }: Props) {
  const [businesses, setBusinesses] = useState(initialBusinesses);
  const [pendingReviews, setPendingReviews] = useState<TrailReview[]>([]);
  const [pendingTrailTalkPosts, setPendingTrailTalkPosts] = useState<TrailTalkPost[]>([]);
  const [serviceRequests, setServiceRequests] = useState<LodgingServiceRequest[]>([]);
  const [marketingLeads, setMarketingLeads] = useState<MarketingLead[]>([]);
  const [bookingTransfers, setBookingTransfers] = useState<BookingTransfer[]>([]);
  const [adminPassword, setAdminPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(initialBusinesses.length > 0);
  const [isLoading, setIsLoading] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<BusinessUpdateInput>({});
  const [error, setError] = useState("");
  const [geocodeStatus, setGeocodeStatus] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  const stats = useMemo(
    () => ({
      pending: businesses.filter((business) => !business.is_approved).length,
      approved: businesses.filter((business) => business.is_approved).length,
      needsChanges: businesses.filter((business) => business.listing_status === "needs_changes").length,
    }),
    [businesses],
  );

  function replaceBusiness(updatedBusiness: Business) {
    setBusinesses((current) =>
      current.map((business) =>
        business.id === updatedBusiness.id ? updatedBusiness : business,
      ),
    );
  }

  async function unlockAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const loadedBusinesses = await getAdminBusinesses(adminPassword);
      const loadedReviews = await getAdminTrailReviews(adminPassword);
      const loadedTrailTalkPosts = await getAdminTrailTalkPosts(adminPassword);
      const loadedServiceRequests = await getAdminServiceRequests(adminPassword);
      const loadedMarketingLeads = await getAdminMarketingLeads(adminPassword);
      const loadedBookingTransfers = await getAdminBookingTransfers(adminPassword);
      setBusinesses(loadedBusinesses);
      setPendingReviews(loadedReviews);
      setPendingTrailTalkPosts(loadedTrailTalkPosts);
      setServiceRequests(loadedServiceRequests);
      setMarketingLeads(loadedMarketingLeads);
      setBookingTransfers(loadedBookingTransfers);
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
      replaceBusiness(await updateAdminBusiness(businessId, editForm, adminPassword));
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

  async function sendTestApprovalEmail() {
    setError("");
    setEmailStatus("");
    setSendingTestEmail(true);

    try {
      const result = await sendAdminTestEmail(adminPassword);
      setEmailStatus(
        result.sent
          ? `Test email sent to ${result.to} from ${result.from}.`
          : `Test email failed: ${result.message}. To: ${result.to}. From: ${result.from}.`,
      );
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
      await updateMarketingLeadStatus(leadId, status, adminPassword);
      setMarketingLeads((current) => current.filter((lead) => lead.id !== leadId));
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
        <article>
          <strong>
            {pendingReviews.length +
              pendingTrailTalkPosts.length +
              serviceRequests.length +
              marketingLeads.length +
              bookingTransfers.length}
          </strong>
          <span>Queues</span>
        </article>
      </div>

      <div className="admin-email-tools">
        <button type="button" disabled={sendingTestEmail} onClick={sendTestApprovalEmail}>
          {sendingTestEmail ? "Sending..." : "Send Test Approval Email"}
        </button>
        <span>Uses the same Resend settings as new business approval emails.</span>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {emailStatus ? <p className="form-success">{emailStatus}</p> : null}
      {geocodeStatus ? <p className="form-success">{geocodeStatus}</p> : null}

      <div className="admin-review-queue">
        <div className="section-heading">
          <p>Booking payouts</p>
          <h2>Scheduled and payout issues</h2>
        </div>
        <div className="admin-email-tools">
          <button
            type="button"
            onClick={async () => {
              setError("");
              setEmailStatus("");
              try {
                const result = await processAdminBookingTransfers(adminPassword);
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
          <span>Runs the same payout processor as the Render scheduled job.</span>
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
        {marketingLeads.length ? (
          <div className="admin-list">
            {marketingLeads.map((lead) => (
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
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
