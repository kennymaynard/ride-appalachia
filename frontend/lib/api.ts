import { sampleBusinesses } from "./sample-data";
import type { StoreProduct } from "./store-products";
import type {
  AdminEmailTestResult,
  AdminAnalytics,
  AdminRiderAccount,
  Business,
  AdminSmsTestResult,
  Booking,
  BookingDetail,
  BookingTransfer,
  BookableListing,
  BookableListingCreateInput,
  Campaign,
  CampaignCreateInput,
  BusinessCreateInput,
  BusinessModerationInput,
  BusinessUpdateInput,
  Category,
  Deal,
  DealCreateInput,
  DealUpdateInput,
  GeocodeResult,
  LodgingServiceRequest,
  LodgingServiceRequestCreateInput,
  MarketingLead,
  MarketingLeadCreateInput,
  PlannerShareInput,
  PlannerShareResult,
  BusinessReviewCreateInput,
  Rider,
  RiderRideCard,
  RiderTrailProgress,
  RiderTrailProgressCreateInput,
  StoreCheckoutInput,
  StoreOrder,
  TrailConditionReport,
  TrailConditionReportCreateInput,
  TrailReview,
  TrailReviewCreateInput,
  TrailTalkPost,
  TrailTalkPostCreateInput,
  RideEvent,
  EventFilters,
  EventSubmissionInput,
  EventPlannerResult,
} from "./types";

function getApiUrl() {
  if (typeof window === "undefined") {
    return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  }

  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}

function timeoutSignal(ms = 3500) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(`${getApiUrl()}${path}`, {
    ...init,
    signal: init.signal || timeoutSignal(),
  });
}

export type SafetySession = {
  id: number; title: string; status: string; expected_return_at: string; expires_at: string;
  ended_at?: string | null; share_url?: string;
};

export async function createSafetySession(payload: { title: string; expected_return_at: string; consent: boolean }, token: string): Promise<SafetySession> {
  const response = await apiFetch("/api/rider-safety/sessions", { method: "POST", headers: { "Content-Type": "application/json", "X-Rider-Token": token }, body: JSON.stringify(payload), signal: timeoutSignal(10000) });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail || "Unable to start safety sharing");
  return response.json();
}

export async function sendSafetyLocation(sessionId: number, payload: Record<string, unknown>, token: string) {
  const response = await apiFetch(`/api/rider-safety/sessions/${sessionId}/locations`, { method: "POST", headers: { "Content-Type": "application/json", "X-Rider-Token": token }, body: JSON.stringify(payload), signal: timeoutSignal(10000) });
  if (!response.ok) throw new Error("Location was not sent");
  return response.json();
}

export async function sendSafetyMessage(sessionId: number, messageType: string, token: string) {
  const response = await apiFetch(`/api/rider-safety/sessions/${sessionId}/messages`, { method: "POST", headers: { "Content-Type": "application/json", "X-Rider-Token": token }, body: JSON.stringify({ message_type: messageType }) });
  if (!response.ok) throw new Error("Message was not sent");
  return response.json();
}

export async function stopSafetySession(sessionId: number, token: string) {
  const response = await apiFetch(`/api/rider-safety/sessions/${sessionId}/stop`, { method: "POST", headers: { "X-Rider-Token": token } });
  if (!response.ok) throw new Error("Unable to stop sharing");
  return response.json();
}

export async function getSharedSafetySession(shareToken: string) {
  const response = await apiFetch(`/api/rider-safety/shared/${encodeURIComponent(shareToken)}`, { cache: "no-store", signal: timeoutSignal(10000) });
  if (!response.ok) throw new Error("This shared ride is unavailable or has expired.");
  return response.json();
}

async function riderSafetyFetch(path: string, token: string, init: RequestInit = {}) {
  const response = await apiFetch(`/api/rider-safety${path}`, { ...init, headers: { "Content-Type": "application/json", "X-Rider-Token": token, ...(init.headers || {}) }, signal: timeoutSignal(15000) });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail || "Unable to update rider safety settings");
  return response.json();
}

export const getSafetyContacts = (token: string) => riderSafetyFetch("/contacts", token);
export const addSafetyContact = (payload: Record<string, unknown>, token: string) => riderSafetyFetch("/contacts", token, { method: "POST", body: JSON.stringify(payload) });
export const deleteSafetyContact = (id: number, token: string) => riderSafetyFetch(`/contacts/${id}`, token, { method: "DELETE" });
export const getSafetyCircles = (token: string) => riderSafetyFetch("/circles", token);
export const addSafetyCircle = (name: string, token: string) => riderSafetyFetch("/circles", token, { method: "POST", body: JSON.stringify({ name }) });
export const inviteSafetyMember = (circleId: number, payload: Record<string, unknown>, token: string) => riderSafetyFetch(`/circles/${circleId}/invites`, token, { method: "POST", body: JSON.stringify(payload) });
export const acceptSafetyInvite = (inviteToken: string) => apiFetch(`/api/rider-safety/invites/${encodeURIComponent(inviteToken)}/accept`, { method: "POST" }).then(async (response) => { if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail || "Invitation unavailable"); return response.json(); });
export const addSafetyCheckpoint = (sessionId: number, payload: Record<string, unknown>, token: string) => riderSafetyFetch(`/sessions/${sessionId}/checkpoints`, token, { method: "POST", body: JSON.stringify(payload) });
export const arriveSafetyCheckpoint = (sessionId: number, checkpointId: number, token: string) => riderSafetyFetch(`/sessions/${sessionId}/checkpoints/${checkpointId}/arrive`, token, { method: "POST" });
export const sendSafetySos = (sessionId: number, token: string) => riderSafetyFetch(`/sessions/${sessionId}/sos`, token, { method: "POST", body: JSON.stringify({ confirmed: true }) });
export const deleteSafetyLocationData = (sessionId: number, token: string) => riderSafetyFetch(`/sessions/${sessionId}/location-data`, token, { method: "DELETE" });

function shouldSkipApiDuringBuild() {
  return typeof window === "undefined" && process.env.SKIP_API_DURING_BUILD === "1";
}

type ListingFilters = {
  category?: Category | "all";
  location?: string;
  q?: string;
  featured?: boolean;
  limit?: number;
  minLatitude?: number;
  maxLatitude?: number;
  minLongitude?: number;
  maxLongitude?: number;
};

type ApiTrailReview = {
  id: number;
  area_slug: string;
  rider_name: string;
  rating: number;
  ride_date: string;
  machine: string;
  difficulty: "Easy" | "Moderate" | "Hard";
  trail_condition: string;
  comment: string;
  photo_url: string;
  photo_caption: string;
  status: "pending" | "approved" | "rejected";
};

type ApiTrailConditionReport = {
  id: number;
  area_slug: string;
  trail_name: string;
  rider_name: string;
  report_type: TrailConditionReport["reportType"];
  severity: TrailConditionReport["severity"];
  note: string;
  latitude?: number | null;
  longitude?: number | null;
  status: "pending" | "approved" | "rejected";
};

function mapTrailReview(review: ApiTrailReview): TrailReview {
  return {
    id: review.id,
    areaSlug: review.area_slug,
    riderName: review.rider_name,
    rating: review.rating,
    rideDate: review.ride_date,
    machine: review.machine,
    difficulty: review.difficulty,
    trailCondition: review.trail_condition,
    comment: review.comment,
    photoUrl: review.photo_url || "",
    photoCaption: review.photo_caption || "",
    status: review.status,
  };
}

function mapTrailConditionReport(report: ApiTrailConditionReport): TrailConditionReport {
  return {
    id: report.id,
    areaSlug: report.area_slug,
    trailName: report.trail_name,
    riderName: report.rider_name,
    reportType: report.report_type,
    severity: report.severity,
    note: report.note,
    latitude: report.latitude,
    longitude: report.longitude,
    status: report.status,
  };
}

function serializeTrailReview(review: TrailReviewCreateInput) {
  return {
    area_slug: review.areaSlug,
    rider_name: review.riderName,
    rating: review.rating,
    ride_date: review.rideDate,
    machine: review.machine,
    difficulty: review.difficulty,
    trail_condition: review.trailCondition,
    comment: review.comment,
    photo_url: review.photoUrl,
    photo_caption: review.photoCaption,
  };
}

function serializeTrailConditionReport(report: TrailConditionReportCreateInput) {
  return {
    area_slug: report.areaSlug,
    trail_name: report.trailName,
    rider_name: report.riderName,
    report_type: report.reportType,
    severity: report.severity,
    note: report.note,
    latitude: report.latitude,
    longitude: report.longitude,
  };
}

export async function getListings(filters?: Category | "all" | ListingFilters): Promise<Business[]> {
  const params = new URLSearchParams();
  const category = typeof filters === "object" ? filters.category : filters;
  const location = typeof filters === "object" ? filters.location : "";
  const options = typeof filters === "object" ? filters : {};
  if (shouldSkipApiDuringBuild()) {
    if (!category || category === "all") return sampleBusinesses;
    if (category === "deals") return sampleBusinesses.filter((business) => business.deals.length > 0);
    return sampleBusinesses.filter((business) => business.category === category);
  }
  if (category) params.set("category", category);
  if (location) params.set("location", location);
  if (options.q) params.set("q", options.q);
  if (typeof options.featured === "boolean") params.set("featured", String(options.featured));
  if (options.limit) params.set("limit", String(options.limit));
  if (typeof options.minLatitude === "number") params.set("min_latitude", String(options.minLatitude));
  if (typeof options.maxLatitude === "number") params.set("max_latitude", String(options.maxLatitude));
  if (typeof options.minLongitude === "number") params.set("min_longitude", String(options.minLongitude));
  if (typeof options.maxLongitude === "number") params.set("max_longitude", String(options.maxLongitude));

  try {
    const response = await apiFetch(`/api/listings?${params.toString()}`, {
      cache: "no-store",
      signal: timeoutSignal(15000),
    });
    if (!response.ok) throw new Error("Unable to load listings");
    return response.json();
  } catch {
    if (!category || category === "all") return sampleBusinesses;
    if (category === "deals") return sampleBusinesses.filter((business) => business.deals.length > 0);
    return sampleBusinesses.filter((business) => business.category === category);
  }
}

export async function getListing(slug: string): Promise<Business | null> {
  if (shouldSkipApiDuringBuild()) {
    return sampleBusinesses.find((business) => business.slug === slug) || null;
  }

  try {
    const response = await apiFetch(`/api/listings/${slug}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return sampleBusinesses.find((business) => business.slug === slug) || null;
  }
}

export async function shareTripPlan(payload: PlannerShareInput): Promise<PlannerShareResult> {
  const response = await apiFetch("/api/planner/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: timeoutSignal(10000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to send trip plan");
  }

  return response.json();
}

export async function getBusiness(businessId: number): Promise<Business | null> {
  try {
    const response = await apiFetch(`/api/businesses/${businessId}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return sampleBusinesses.find((business) => business.id === businessId) || null;
  }
}

function getBusinessHeaders(ownerAccessToken?: string): Record<string, string> {
  return ownerAccessToken ? { "x-business-token": ownerAccessToken } : {};
}

function getRiderHeaders(riderAccessToken?: string): Record<string, string> {
  return riderAccessToken ? { "x-rider-token": riderAccessToken } : {};
}

export async function geocodeLocation(query: string): Promise<GeocodeResult> {
  const response = await fetch(
    `${getApiUrl()}/api/geocode?query=${encodeURIComponent(query)}`,
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to find that location");
  }

  return response.json();
}

export async function getBusinessByAccessToken(ownerAccessToken: string): Promise<Business | null> {
  const cleanToken = ownerAccessToken.trim();
  if (!cleanToken) return null;

  try {
    const response = await apiFetch(`/api/businesses/access/${encodeURIComponent(cleanToken)}`, {
      cache: "no-store",
      signal: timeoutSignal(10000),
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function syncSubscriptionCheckoutSession(sessionId: string): Promise<boolean> {
  try {
    const response = await apiFetch(
      `/api/subscriptions/checkout-session/${encodeURIComponent(sessionId)}/sync`,
      {
        method: "POST",
        cache: "no-store",
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function createBusiness(payload: BusinessCreateInput): Promise<Business> {
  const response = await fetch(`${getApiUrl()}/api/businesses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to create business");
  }

  return response.json();
}

export async function loginBusiness(
  ownerEmail: string,
  ownerPasscode: string,
): Promise<{ access_url: string; email_sent: boolean; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/businesses/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner_email: ownerEmail, owner_passcode: ownerPasscode }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to find business");
  }

  return response.json();
}

export async function loginRider(payload: {
  email: string;
  password: string;
  display_name?: string;
  phone?: string;
  home_location?: string;
  home_latitude?: number;
  home_longitude?: number;
}): Promise<{ access_url: string; access_token: string; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/riders/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to open rider profile");
  }

  return response.json();
}

export async function requestRiderPasswordReset(
  email: string,
): Promise<{ sent: boolean; message: string; reset_url?: string }> {
  const response = await fetch(`${getApiUrl()}/api/riders/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to request password reset");
  }

  return response.json();
}

export async function confirmRiderPasswordReset(payload: {
  reset_token: string;
  password: string;
}): Promise<{ access_url: string; access_token: string; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/riders/password-reset/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to reset rider password");
  }

  return response.json();
}

export async function recordPageVisit(payload: { path: string; referrer?: string }) {
  try {
    await fetch(`${getApiUrl()}/api/analytics/page-visits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Analytics should never block the app.
  }
}

export async function getRiderProfile(riderAccessToken: string): Promise<Rider | null> {
  try {
    const response = await apiFetch("/api/riders/me", {
      cache: "no-store",
      headers: getRiderHeaders(riderAccessToken),
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function getRiderRideCard(riderAccessToken: string): Promise<RiderRideCard | null> {
  try {
    const response = await apiFetch("/api/riders/ride-card", {
      cache: "no-store",
      headers: getRiderHeaders(riderAccessToken),
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function saveRiderProgress(
  payload: RiderTrailProgressCreateInput,
  riderAccessToken: string,
): Promise<RiderTrailProgress> {
  const response = await fetch(`${getApiUrl()}/api/riders/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getRiderHeaders(riderAccessToken) },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to save trail progress");
  }

  return response.json();
}

export async function requestVeteranVerification(
  payload: { document_name: string; notes: string },
  riderAccessToken: string,
): Promise<Rider> {
  const response = await fetch(`${getApiUrl()}/api/riders/veteran-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getRiderHeaders(riderAccessToken) },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to request verification");
  }

  return response.json();
}

export async function updateRiderAlerts(
  payload: Partial<
    Pick<
      Rider,
      | "phone"
      | "alert_phone_opt_in"
      | "alert_email_opt_in"
      | "storm_alerts_enabled"
      | "trail_alerts_enabled"
    >
  >,
  riderAccessToken: string,
): Promise<Rider> {
  const response = await fetch(`${getApiUrl()}/api/riders/me/alerts`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getRiderHeaders(riderAccessToken) },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to save alert preferences");
  }

  return response.json();
}

export async function createPartnerVisit(
  payload: { business_id: number; discount_code?: string; source?: string },
  riderAccessToken: string,
): Promise<void> {
  const response = await fetch(`${getApiUrl()}/api/riders/partner-visits`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getRiderHeaders(riderAccessToken) },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to save partner visit");
  }
}

export async function createBusinessReview(
  payload: BusinessReviewCreateInput,
  riderAccessToken?: string,
): Promise<void> {
  const response = await fetch(`${getApiUrl()}/api/business-reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getRiderHeaders(riderAccessToken) },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to submit business review");
  }
}

export async function updateBusiness(
  businessId: number,
  payload: BusinessUpdateInput,
  ownerAccessToken?: string,
): Promise<Business> {
  const response = await fetch(`${getApiUrl()}/api/businesses/${businessId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getBusinessHeaders(ownerAccessToken) },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to update business");
  }

  return response.json();
}

export async function claimBusiness(
  businessId: number,
  payload: { claimant_name: string; claimant_email: string; claimant_phone: string; claimant_role: string; proof_url: string; proof_notes: string; subscription_tier: string },
  riderToken = "",
): Promise<import("./types").BusinessClaim> {
  const response = await fetch(`${getApiUrl()}/api/businesses/${businessId}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Rider-Token": riderToken },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to verify business ownership");
  }

  return response.json();
}

export async function verifyBusinessClaimEmail(claimId: number, claimantEmail: string, code: string): Promise<import("./types").BusinessClaim> {
  const response = await fetch(`${getApiUrl()}/api/business-claims/${claimId}/verify-email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ claimant_email: claimantEmail, code }) });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail || "Unable to verify the claim code");
  return response.json();
}

export async function activateExistingImportedBusinesses(adminPassword: string): Promise<{ activated: number }> {
  const response = await fetch(`${getApiUrl()}/api/admin/business-import/activate-existing`, {
    method: "POST", headers: getAdminHeaders(adminPassword),
  });
  if (!response.ok) throw new Error((await response.text()) || "Unable to activate imported businesses");
  return response.json();
}

export async function getAdminBusinessClaims(adminPassword: string): Promise<import("./types").BusinessClaim[]> {
  const response = await fetch(`${getApiUrl()}/api/admin/business-claims`, { cache: "no-store", headers: getAdminHeaders(adminPassword) });
  if (!response.ok) throw new Error((await response.text()) || "Unable to load business claims");
  return response.json();
}

export async function reviewAdminBusinessClaim(claimId: number, action: "approve" | "reject", adminNotes: string, adminPassword: string): Promise<import("./types").BusinessClaim> {
  const response = await fetch(`${getApiUrl()}/api/admin/business-claims/${claimId}/review`, {
    method: "POST", headers: { "Content-Type": "application/json", ...getAdminHeaders(adminPassword) }, body: JSON.stringify({ action, admin_notes: adminNotes }),
  });
  if (!response.ok) throw new Error((await response.text()) || "Unable to review business claim");
  return response.json();
}

export async function addDeal(payload: DealCreateInput, ownerAccessToken?: string): Promise<Deal> {
  const response = await fetch(`${getApiUrl()}/api/businesses/${payload.business_id}/deals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getBusinessHeaders(ownerAccessToken) },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to add deal");
  }

  return response.json();
}

export async function updateDeal(
  businessId: number,
  dealId: number,
  payload: DealUpdateInput,
  ownerAccessToken?: string,
): Promise<Deal> {
  const response = await fetch(`${getApiUrl()}/api/businesses/${businessId}/deals/${dealId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getBusinessHeaders(ownerAccessToken) },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to update deal");
  }

  return response.json();
}

export async function deleteDeal(
  businessId: number,
  dealId: number,
  ownerAccessToken?: string,
): Promise<void> {
  const response = await fetch(`${getApiUrl()}/api/businesses/${businessId}/deals/${dealId}`, {
    method: "DELETE",
    headers: getBusinessHeaders(ownerAccessToken),
  });

  if (!response.ok) {
    throw new Error("Unable to delete deal");
  }
}

export async function createCampaign(
  payload: CampaignCreateInput,
  ownerAccessToken?: string,
): Promise<Campaign> {
  const response = await fetch(`${getApiUrl()}/api/businesses/${payload.business_id}/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getBusinessHeaders(ownerAccessToken) },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to create campaign");
  }

  return response.json();
}

export async function createLodgingServiceRequest(
  payload: LodgingServiceRequestCreateInput,
  ownerAccessToken?: string,
): Promise<LodgingServiceRequest> {
  const response = await fetch(`${getApiUrl()}/api/businesses/${payload.business_id}/service-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getBusinessHeaders(ownerAccessToken) },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to request lodging service help");
  }

  return response.json();
}

export async function createBookableListing(
  businessId: number,
  payload: BookableListingCreateInput,
  ownerAccessToken?: string,
): Promise<BookableListing> {
  const response = await fetch(`${getApiUrl()}/api/businesses/${businessId}/bookable-listings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getBusinessHeaders(ownerAccessToken) },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to add bookable listing");
  }

  return response.json();
}

export async function addListingCalendar(
  businessId: number,
  listingId: number,
  payload: { provider: string; ical_url: string; is_active: boolean },
  ownerAccessToken?: string,
): Promise<BookableListing["calendars"][number]> {
  const response = await fetch(
    `${getApiUrl()}/api/businesses/${businessId}/bookable-listings/${listingId}/calendars`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getBusinessHeaders(ownerAccessToken) },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to add calendar link");
  }

  return response.json();
}

export async function syncListingCalendar(
  businessId: number,
  listingId: number,
  calendarId: number,
  ownerAccessToken?: string,
): Promise<BookableListing["calendars"][number]> {
  const response = await fetch(
    `${getApiUrl()}/api/businesses/${businessId}/bookable-listings/${listingId}/calendars/${calendarId}/sync`,
    {
      method: "POST",
      headers: getBusinessHeaders(ownerAccessToken),
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to sync calendar");
  }

  return response.json();
}

export async function approveBooking(
  businessId: number,
  bookingId: number,
  ownerAccessToken?: string,
): Promise<Booking> {
  const response = await fetch(`${getApiUrl()}/api/businesses/${businessId}/bookings/${bookingId}/approve`, {
    method: "POST",
    headers: getBusinessHeaders(ownerAccessToken),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to approve booking");
  }

  return response.json();
}

export async function decideBookingCancellation(
  businessId: number,
  bookingId: number,
  payload: {
    approved: boolean;
    note: string;
    refund_mode?: "full" | "minus_cleaning_fee" | "half" | "none" | "custom";
    custom_refund_cents?: number;
  },
  ownerAccessToken?: string,
): Promise<Booking> {
  const response = await fetch(
    `${getApiUrl()}/api/businesses/${businessId}/bookings/${bookingId}/cancel-decision`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getBusinessHeaders(ownerAccessToken) },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to update cancellation request");
  }

  return response.json();
}

export async function requestBookingCancellation(
  bookingId: number,
  payload: { customer_email: string; reason: string },
  riderAccessToken?: string,
): Promise<Booking> {
  const response = await fetch(`${getApiUrl()}/api/bookings/${bookingId}/cancel-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getRiderHeaders(riderAccessToken) },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to request cancellation");
  }

  return response.json();
}

export async function lookupBooking(
  payload: { booking_id: number; customer_email: string },
): Promise<BookingDetail> {
  const response = await fetch(`${getApiUrl()}/api/bookings/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to find that booking");
  }

  return response.json();
}

export async function createStripeConnectOnboarding(
  businessId: number,
  ownerAccessToken?: string,
): Promise<{ onboarding_url: string; stripe_connect_account_id: string }> {
  const response = await fetch(`${getApiUrl()}/api/businesses/${businessId}/stripe-connect/onboarding`, {
    method: "POST",
    headers: getBusinessHeaders(ownerAccessToken),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to connect Stripe payouts");
  }

  return response.json();
}

export async function syncStripeConnectStatus(
  businessId: number,
  ownerAccessToken?: string,
): Promise<{
  stripe_connect_account_id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  onboarding_complete: boolean;
  business_name?: string;
  business_email?: string;
}> {
  const response = await fetch(`${getApiUrl()}/api/businesses/${businessId}/stripe-connect/status`, {
    method: "POST",
    headers: getBusinessHeaders(ownerAccessToken),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to refresh Stripe status");
  }

  return response.json();
}

export async function acceptPartnerTaxAgreement(
  businessId: number,
  ownerAccessToken?: string,
): Promise<{ accepted: boolean; accepted_at?: string | null }> {
  const response = await fetch(`${getApiUrl()}/api/businesses/${businessId}/partner-tax-agreement`, {
    method: "POST",
    headers: getBusinessHeaders(ownerAccessToken),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to accept partner agreement");
  }

  return response.json();
}

export async function createMarketingLead(payload: MarketingLeadCreateInput): Promise<MarketingLead> {
  const response = await fetch(`${getApiUrl()}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to save lead");
  }

  return response.json();
}

export async function trackActionClick(businessId: number): Promise<void> {
  try {
    await fetch(`${getApiUrl()}/api/listings/${businessId}/action-click`, {
      method: "POST",
      keepalive: true,
    });
  } catch {
    // Click tracking should never block the rider action.
  }
}

export async function trackDealClaimClick(dealId: number): Promise<void> {
  try {
    await fetch(`${getApiUrl()}/api/deals/${dealId}/claim-click`, {
      method: "POST",
      keepalive: true,
    });
  } catch {
    // Click tracking should never block the rider action.
  }
}

export async function createCheckout(
  tier: string,
  businessId?: number,
  ownerAccessToken?: string,
): Promise<string> {
  const response = await fetch(`${getApiUrl()}/api/subscriptions/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getBusinessHeaders(ownerAccessToken) },
    body: JSON.stringify({ tier, business_id: businessId }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to create checkout");
  }

  const data = (await response.json()) as { checkout_url: string };
  return data.checkout_url;
}

export async function createStoreCheckout(payload: StoreCheckoutInput): Promise<string> {
  const response = await apiFetch("/api/store/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: timeoutSignal(10000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to create store checkout");
  }

  const data = (await response.json()) as { checkout_url: string };
  return data.checkout_url;
}

export async function getTrailReviews(areaSlug: string): Promise<TrailReview[]> {
  if (shouldSkipApiDuringBuild()) {
    throw new Error("Skipping API during build");
  }

  const response = await apiFetch(`/api/trail-reviews?area_slug=${areaSlug}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Unable to load trail reviews");
  }
  const reviews = (await response.json()) as ApiTrailReview[];
  return reviews.map(mapTrailReview);
}

export async function createTrailReview(payload: TrailReviewCreateInput): Promise<TrailReview> {
  const response = await fetch(`${getApiUrl()}/api/trail-reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(serializeTrailReview(payload)),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to submit trail review");
  }
  return mapTrailReview((await response.json()) as ApiTrailReview);
}

export async function getTrailConditionReports(areaSlug: string): Promise<TrailConditionReport[]> {
  if (shouldSkipApiDuringBuild()) {
    return [];
  }

  const response = await apiFetch(`/api/trail-condition-reports?area_slug=${areaSlug}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Unable to load trail condition reports");
  }
  const reports = (await response.json()) as ApiTrailConditionReport[];
  return reports.map(mapTrailConditionReport);
}

export async function createTrailConditionReport(
  payload: TrailConditionReportCreateInput,
): Promise<TrailConditionReport> {
  const response = await fetch(`${getApiUrl()}/api/trail-condition-reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(serializeTrailConditionReport(payload)),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to submit condition report");
  }
  return mapTrailConditionReport((await response.json()) as ApiTrailConditionReport);
}

export async function getTrailTalkPosts(filters?: {
  category?: string;
  areaSlug?: string;
}): Promise<TrailTalkPost[]> {
  if (shouldSkipApiDuringBuild()) {
    return [];
  }

  const params = new URLSearchParams();
  if (filters?.category) params.set("category", filters.category);
  if (filters?.areaSlug) params.set("area_slug", filters.areaSlug);

  try {
    const response = await apiFetch(`/api/trail-talk?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Unable to load Trail Talk posts");
    return response.json();
  } catch {
    return [];
  }
}

export async function createTrailTalkPost(
  payload: TrailTalkPostCreateInput,
): Promise<TrailTalkPost> {
  const response = await fetch(`${getApiUrl()}/api/trail-talk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to submit Trail Talk post");
  }
  return response.json();
}

function getAdminHeaders(adminPassword?: string): Record<string, string> {
  const trimmedPassword = adminPassword?.trim();
  return trimmedPassword ? { "x-admin-password": trimmedPassword } : {};
}

export async function getEvents(filters: EventFilters = {}): Promise<RideEvent[]> {
  if (shouldSkipApiDuringBuild()) return [];
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const response = await apiFetch(`/api/events${params.size ? `?${params}` : ""}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load events");
  return response.json();
}

export async function submitEvent(payload: EventSubmissionInput): Promise<RideEvent> {
  const response = await fetch(`${getApiUrl()}/api/events/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error((await response.text()) || "Unable to submit event");
  return response.json();
}

export async function getEventPlanner(slug: string, radius = 25): Promise<EventPlannerResult> {
  const response = await apiFetch(`/api/events/${slug}/planner?radius=${radius}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load ride planner");
  return response.json();
}

export async function getEvent(slug: string): Promise<RideEvent | null> {
  const response = await apiFetch(`/api/events/${encodeURIComponent(slug)}`, { cache: "no-store" });
  return response.ok ? response.json() : null;
}

export async function getEventEngagement(slug: string, token = "") {
  const response = await apiFetch(`/api/events/${encodeURIComponent(slug)}/engagement`, { headers: token ? { "X-Rider-Token": token } : {} });
  if (!response.ok) throw new Error("Unable to load event activity");
  return response.json();
}

export async function saveRideEvent(eventId: number, token: string, saved: boolean) {
  const response = await apiFetch(`/api/events/${eventId}/save`, { method: saved ? "POST" : "DELETE", headers: { "X-Rider-Token": token } });
  if (!response.ok) throw new Error("Rider login required to save events");
  return response.json();
}

export async function setEventAttendance(eventId: number, token: string, status: string) {
  const response = await apiFetch(`/api/events/${eventId}/attendance`, { method: "POST", headers: { "Content-Type": "application/json", "X-Rider-Token": token }, body: JSON.stringify({ status }) });
  if (!response.ok) throw new Error("Rider login required to update attendance");
  return response.json();
}

export async function createEventPlan(eventId: number, token: string, payload: object) {
  const response = await apiFetch(`/api/events/${eventId}/plans`, { method: "POST", headers: { "Content-Type": "application/json", "X-Rider-Token": token }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error("Unable to save ride plan");
  return response.json();
}

export async function getSavedRideEvents(token: string): Promise<RideEvent[]> {
  const response = await apiFetch("/api/riders/me/saved-events", { headers: { "X-Rider-Token": token }, cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load saved events");
  return response.json();
}

export async function getAdminEvents(adminPassword: string, status = "all"): Promise<RideEvent[]> {
  const response = await fetch(`${getApiUrl()}/api/admin/events?status=${status}`, {
    cache: "no-store",
    headers: getAdminHeaders(adminPassword),
  });
  if (!response.ok) throw new Error("Unable to load admin events");
  return response.json();
}

export async function createAdminEvent(payload: Partial<RideEvent>, adminPassword: string): Promise<RideEvent> {
  const response = await fetch(`${getApiUrl()}/api/admin/events`, {
    method: "POST", headers: { "Content-Type": "application/json", ...getAdminHeaders(adminPassword) }, body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error((await response.text()) || "Unable to create event");
  return response.json();
}

export async function updateAdminEvent(eventId: number, payload: Partial<RideEvent>, adminPassword: string): Promise<RideEvent> {
  const response = await fetch(`${getApiUrl()}/api/admin/events/${eventId}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", ...getAdminHeaders(adminPassword) }, body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error((await response.text()) || "Unable to update event");
  return response.json();
}

export async function moderateAdminEvent(eventId: number, payload: { status: string; admin_notes?: string; is_verified?: boolean; is_featured?: boolean; verification_source?: string }, adminPassword: string): Promise<RideEvent> {
  const response = await fetch(`${getApiUrl()}/api/admin/events/${eventId}/moderate`, {
    method: "POST", headers: { "Content-Type": "application/json", ...getAdminHeaders(adminPassword) }, body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error((await response.text()) || "Unable to moderate event");
  return response.json();
}

export async function getAdminBusinesses(adminPassword?: string, includeDeleted = false): Promise<Business[]> {
  const params = new URLSearchParams();
  if (includeDeleted) params.set("include_deleted", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${getApiUrl()}/api/admin/businesses${query}`, {
    cache: "no-store",
    headers: getAdminHeaders(adminPassword),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Admin password is incorrect. Use the ADMIN_PASSWORD value from the backend service in Render.");
    }
    if (response.status === 403 || response.status === 0) {
      throw new Error("Admin API is blocked. Use appalachiaoffroadapp.com without www, or redeploy the backend.");
    }
    if (response.status >= 500) {
      throw new Error("Admin password was accepted, but the backend could not load the business dashboard. Check backend logs for the failing admin endpoint.");
    }
    throw new Error(`Unable to load admin businesses. API returned ${response.status}.`);
  }

  return response.json();
}

export async function scanOpenStreetMapBusinesses(
  payload: { area_slug: string; area_name: string; latitude: number; longitude: number; radius_miles: number },
  adminPassword: string,
): Promise<import("./types").BusinessImportCandidate[]> {
  const response = await fetch(`${getApiUrl()}/api/admin/business-import/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAdminHeaders(adminPassword) },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error((await response.text()) || "Unable to scan OpenStreetMap businesses");
  return response.json();
}

export async function importOpenStreetMapBusinesses(
  candidates: import("./types").BusinessImportCandidate[],
  adminPassword: string,
): Promise<{ imported: number; skipped: number; business_ids: number[] }> {
  const response = await fetch(`${getApiUrl()}/api/admin/business-import/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAdminHeaders(adminPassword) },
    body: JSON.stringify({ candidates }),
  });
  if (!response.ok) throw new Error((await response.text()) || "Unable to import businesses");
  return response.json();
}

export async function getStoreProducts(): Promise<StoreProduct[]> {
  const response = await apiFetch("/api/store/products", {
    cache: "no-store",
    signal: timeoutSignal(10000),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to load store products");
  }
  return response.json();
}

export async function getAdminPrintifyProducts(
  adminPassword?: string,
): Promise<{ configured: boolean; count: number; products: StoreProduct[]; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/admin/store/printify-products`, {
    cache: "no-store",
    headers: getAdminHeaders(adminPassword),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to load Printify products");
  }
  return response.json();
}

export async function getAdminAnalytics(adminPassword?: string): Promise<AdminAnalytics> {
  const response = await fetch(`${getApiUrl()}/api/admin/analytics`, {
    cache: "no-store",
    headers: getAdminHeaders(adminPassword),
  });
  if (!response.ok) {
    throw new Error("Unable to load admin analytics");
  }
  return response.json();
}

export async function sendAdminTestEmail(
  adminPassword?: string,
): Promise<AdminEmailTestResult> {
  const response = await fetch(`${getApiUrl()}/api/admin/test-email`, {
    method: "POST",
    headers: getAdminHeaders(adminPassword),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to send test email");
  }

  return response.json();
}

export async function sendAdminDirectTestEmail(
  adminPassword?: string,
): Promise<AdminEmailTestResult> {
  const response = await fetch(`${getApiUrl()}/api/admin/test-email/direct`, {
    method: "POST",
    headers: getAdminHeaders(adminPassword),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to send direct test email");
  }

  return response.json();
}

export async function sendAdminTestSms(
  phone: string,
  audience: "rider" | "business",
  adminPassword?: string,
): Promise<AdminSmsTestResult> {
  const response = await fetch(`${getApiUrl()}/api/admin/test-sms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAdminHeaders(adminPassword) },
    body: JSON.stringify({ phone, audience }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to send test SMS");
  }

  return response.json();
}

export async function getAdminTrailReviews(adminPassword?: string): Promise<TrailReview[]> {
  const response = await fetch(`${getApiUrl()}/api/admin/trail-reviews?status=pending`, {
    cache: "no-store",
    headers: getAdminHeaders(adminPassword),
  });
  if (!response.ok) {
    throw new Error("Unable to load pending trail reviews");
  }
  const reviews = (await response.json()) as ApiTrailReview[];
  return reviews.map(mapTrailReview);
}

export async function getAdminTrailConditionReports(
  adminPassword?: string,
): Promise<TrailConditionReport[]> {
  const response = await fetch(`${getApiUrl()}/api/admin/trail-condition-reports?status=pending`, {
    cache: "no-store",
    headers: getAdminHeaders(adminPassword),
  });
  if (!response.ok) {
    throw new Error("Unable to load pending trail condition reports");
  }
  const reports = (await response.json()) as ApiTrailConditionReport[];
  return reports.map(mapTrailConditionReport);
}

export async function getAdminTrailTalkPosts(adminPassword?: string): Promise<TrailTalkPost[]> {
  const response = await fetch(`${getApiUrl()}/api/admin/trail-talk?status=pending`, {
    cache: "no-store",
    headers: getAdminHeaders(adminPassword),
  });
  if (!response.ok) {
    throw new Error("Unable to load pending Trail Talk posts");
  }
  return response.json();
}

export async function getAdminServiceRequests(
  adminPassword?: string,
): Promise<LodgingServiceRequest[]> {
  const response = await fetch(`${getApiUrl()}/api/admin/service-requests?status=new`, {
    cache: "no-store",
    headers: getAdminHeaders(adminPassword),
  });
  if (!response.ok) {
    throw new Error("Unable to load lodging service requests");
  }
  return response.json();
}

export async function getAdminMarketingLeads(
  adminPassword?: string,
): Promise<MarketingLead[]> {
  try {
    const response = await fetch(`${getApiUrl()}/api/admin/leads?status=new`, {
      cache: "no-store",
      headers: getAdminHeaders(adminPassword),
    });
    if (!response.ok) {
      return [];
    }
    return response.json();
  } catch {
    return [];
  }
}

export async function getAdminBookingTransfers(
  adminPassword?: string,
): Promise<BookingTransfer[]> {
  const response = await fetch(`${getApiUrl()}/api/admin/booking-transfers?status=needs_attention`, {
    cache: "no-store",
    headers: getAdminHeaders(adminPassword),
  });
  if (!response.ok) {
    return [];
  }
  return response.json();
}

export async function getAdminStoreOrders(adminPassword?: string): Promise<StoreOrder[]> {
  const response = await fetch(`${getApiUrl()}/api/admin/store/orders`, {
    cache: "no-store",
    headers: getAdminHeaders(adminPassword),
  });
  if (!response.ok) {
    return [];
  }
  return response.json();
}

export async function getAdminRiders(adminPassword?: string): Promise<AdminRiderAccount[]> {
  const response = await fetch(`${getApiUrl()}/api/admin/riders`, {
    cache: "no-store",
    headers: getAdminHeaders(adminPassword),
  });
  if (!response.ok) {
    return [];
  }
  return response.json();
}

export async function processAdminBookingTransfers(
  adminPassword?: string,
): Promise<{ due: number; processed: number; missing_connect_account: number; failed: number }> {
  const response = await fetch(`${getApiUrl()}/api/admin/booking-transfers/process`, {
    method: "POST",
    headers: getAdminHeaders(adminPassword),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to process booking payouts");
  }
  return response.json();
}

export async function updateMarketingLeadStatus(
  leadId: number,
  status: "contacted" | "converted" | "closed",
  adminPassword?: string,
): Promise<MarketingLead> {
  const response = await fetch(`${getApiUrl()}/api/admin/leads/${leadId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAdminHeaders(adminPassword) },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error("Unable to update marketing lead");
  }
  return response.json();
}

export async function updateServiceRequestStatus(
  requestId: number,
  status: "contacted" | "matched" | "closed",
  adminPassword?: string,
): Promise<LodgingServiceRequest> {
  const response = await fetch(`${getApiUrl()}/api/admin/service-requests/${requestId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAdminHeaders(adminPassword) },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error("Unable to update lodging service request");
  }
  return response.json();
}

export async function moderateTrailReview(
  reviewId: number,
  status: "approved" | "rejected",
  adminPassword?: string,
): Promise<TrailReview> {
  const response = await fetch(`${getApiUrl()}/api/admin/trail-reviews/${reviewId}/moderate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAdminHeaders(adminPassword) },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error("Unable to moderate trail review");
  }
  return mapTrailReview((await response.json()) as ApiTrailReview);
}

export async function moderateTrailConditionReport(
  reportId: number,
  status: "approved" | "rejected",
  adminPassword?: string,
): Promise<TrailConditionReport> {
  const response = await fetch(`${getApiUrl()}/api/admin/trail-condition-reports/${reportId}/moderate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAdminHeaders(adminPassword) },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error("Unable to moderate trail condition report");
  }
  return mapTrailConditionReport((await response.json()) as ApiTrailConditionReport);
}

export async function moderateTrailTalkPost(
  postId: number,
  status: "approved" | "rejected",
  adminPassword?: string,
): Promise<TrailTalkPost> {
  const response = await fetch(`${getApiUrl()}/api/admin/trail-talk/${postId}/moderate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAdminHeaders(adminPassword) },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error("Unable to moderate Trail Talk post");
  }
  return response.json();
}

export async function approveBusiness(
  businessId: number,
  adminPassword?: string,
): Promise<Business> {
  const response = await fetch(`${getApiUrl()}/api/admin/businesses/${businessId}/approve`, {
    method: "POST",
    headers: getAdminHeaders(adminPassword),
  });

  if (!response.ok) {
    throw new Error("Unable to approve business");
  }

  return response.json();
}

export async function setBusinessFeatured(
  businessId: number,
  featured: boolean,
  adminPassword?: string,
): Promise<Business> {
  const response = await fetch(
    `${getApiUrl()}/api/admin/businesses/${businessId}/featured?featured=${featured}`,
    {
      method: "POST",
      headers: getAdminHeaders(adminPassword),
    },
  );

  if (!response.ok) {
    throw new Error("Unable to update featured status");
  }

  return response.json();
}

export async function moderateBusiness(
  businessId: number,
  payload: BusinessModerationInput,
  adminPassword?: string,
): Promise<Business> {
  const response = await fetch(`${getApiUrl()}/api/admin/businesses/${businessId}/moderate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAdminHeaders(adminPassword) },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Unable to moderate business");
  }

  return response.json();
}

export async function deleteAdminBusiness(
  businessId: number,
  adminPassword?: string,
): Promise<Business> {
  const response = await fetch(`${getApiUrl()}/api/admin/businesses/${businessId}`, {
    method: "DELETE",
    headers: getAdminHeaders(adminPassword),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to delete business");
  }

  return response.json();
}

export async function restoreAdminBusiness(
  businessId: number,
  adminPassword?: string,
): Promise<Business> {
  const response = await fetch(`${getApiUrl()}/api/admin/businesses/${businessId}/restore`, {
    method: "POST",
    headers: getAdminHeaders(adminPassword),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to restore business");
  }

  return response.json();
}

export async function updateAdminBusiness(
  businessId: number,
  payload: BusinessUpdateInput,
  adminPassword?: string,
): Promise<Business> {
  const response = await fetch(`${getApiUrl()}/api/admin/businesses/${businessId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAdminHeaders(adminPassword) },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Unable to edit business");
  }

  return response.json();
}

export async function getEventSources(adminPassword: string) {
  const response = await fetch(`${getApiUrl()}/api/admin/event-sources`, { headers: getAdminHeaders(adminPassword) });
  if (!response.ok) throw new Error("Unable to load event sources");
  return response.json();
}

export async function createEventSource(payload: Record<string, unknown>, adminPassword: string) {
  const response = await fetch(`${getApiUrl()}/api/admin/event-sources`, { method: "POST", headers: { "Content-Type": "application/json", ...getAdminHeaders(adminPassword) }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(await response.text() || "Unable to create event source");
  return response.json();
}

export async function updateEventSource(sourceId: number, payload: Record<string, unknown>, adminPassword: string) {
  const response = await fetch(`${getApiUrl()}/api/admin/event-sources/${sourceId}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...getAdminHeaders(adminPassword) }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error("Unable to update event source");
  return response.json();
}

export async function getEventCandidates(adminPassword: string) {
  const response = await fetch(`${getApiUrl()}/api/admin/event-candidates`, { headers: getAdminHeaders(adminPassword) });
  if (!response.ok) throw new Error("Unable to load event candidates");
  return response.json();
}

export async function reviewEventCandidate(candidateId: number, payload: Record<string, unknown>, adminPassword: string) {
  const response = await fetch(`${getApiUrl()}/api/admin/event-candidates/${candidateId}/review`, { method: "POST", headers: { "Content-Type": "application/json", ...getAdminHeaders(adminPassword) }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(await response.text() || "Unable to review candidate");
  return response.json();
}

export async function runEventDiscovery(sourceId: number | undefined, adminPassword: string) {
  const query = sourceId ? `?source_id=${sourceId}` : "";
  const response = await fetch(`${getApiUrl()}/api/admin/event-discovery/run${query}`, { method: "POST", headers: getAdminHeaders(adminPassword) });
  if (!response.ok) throw new Error("Unable to run event discovery");
  return response.json();
}

export async function getEventsIntelligence(adminPassword: string) {
  const response = await fetch(`${getApiUrl()}/api/admin/events-intelligence`, { headers: getAdminHeaders(adminPassword) });
  if (!response.ok) throw new Error("Unable to load events intelligence");
  return response.json();
}

export async function getEventDestination(slug: string): Promise<import("./types").EventDestination | null> {
  const cacheOptions: RequestInit & { next: { revalidate: number } } = {
    next: { revalidate: 900 },
  };
  const response = await fetch(
    `${getApiUrl()}/api/events/${encodeURIComponent(slug)}/destination`,
    cacheOptions,
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Unable to load event destination");
  return response.json();
}

export async function addEventDiscussion(eventId: number, token: string, kind: "comment" | "question", message: string) {
  const response = await fetch(`${getApiUrl()}/api/events/${eventId}/discussions`, { method: "POST", headers: { "Content-Type": "application/json", "X-Rider-Token": token }, body: JSON.stringify({ kind, message }) });
  if (!response.ok) throw new Error("Unable to submit event discussion"); return response.json();
}

export async function addEventMedia(eventId: number, token: string, media_type: "photo" | "video", media_url: string, caption: string) {
  const response = await fetch(`${getApiUrl()}/api/events/${eventId}/media`, { method: "POST", headers: { "Content-Type": "application/json", "X-Rider-Token": token }, body: JSON.stringify({ media_type, media_url, caption }) });
  if (!response.ok) throw new Error("Unable to submit event media"); return response.json();
}

export async function createEventInvite(eventId: number, token: string, email: string) {
  const response = await fetch(`${getApiUrl()}/api/events/${eventId}/invites`, { method: "POST", headers: { "Content-Type": "application/json", "X-Rider-Token": token }, body: JSON.stringify({ email }) });
  if (!response.ok) throw new Error("Unable to create invite"); return response.json();
}

export async function downloadAdminEventFlyer(eventId: number, format: "facebook" | "instagram" | "story" | "poster" | "pdf", adminPassword: string) {
  const response = await fetch(`${getApiUrl()}/api/admin/events/${eventId}/flyer.${format}`, { headers: getAdminHeaders(adminPassword) });
  if (!response.ok) throw new Error("Unable to generate flyer");
  const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `event-${eventId}-${format}.${format === "pdf" ? "pdf" : "svg"}`; anchor.click(); URL.revokeObjectURL(url);
}

export async function getExploreDestinations(query = ""): Promise<import("./types").ExploreDestination[]> {
  const response = await apiFetch(`/api/explore${query ? `?${query}` : ""}`, { cache: "no-store", signal: timeoutSignal(15000) });
  if (!response.ok) throw new Error("Unable to load Explore destinations");
  return response.json();
}

export async function getExploreDestination(slug: string): Promise<import("./types").ExploreDestination | null> {
  const response = await apiFetch(`/api/explore/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Unable to load destination");
  return response.json();
}

export async function createExploreClaimTarget(slug:string,riderToken:string):Promise<{business_id:number;business_slug:string;claim_url:string}>{const response=await apiFetch(`/api/explore/${encodeURIComponent(slug)}/claim-target`,{method:"POST",headers:{"X-Rider-Token":riderToken}});if(!response.ok)throw new Error((await response.json().catch(()=>null))?.detail||"Unable to claim this listing");return response.json()}
export async function submitExploreOwnerUpdate(businessId:number,payload:Record<string,unknown>,token:string):Promise<import("./types").ExploreOwnerUpdate>{const response=await apiFetch(`/api/businesses/${businessId}/explore-update-requests`,{method:"POST",headers:{"Content-Type":"application/json","X-Business-Token":token},body:JSON.stringify(payload)});if(!response.ok)throw new Error((await response.json().catch(()=>null))?.detail||"Unable to submit Explore updates");return response.json()}
export async function getAdminExploreOwnerUpdates(adminPassword:string):Promise<import("./types").ExploreOwnerUpdate[]>{const response=await apiFetch("/api/admin/explore-update-requests",{cache:"no-store",headers:getAdminHeaders(adminPassword)});if(!response.ok)throw new Error("Unable to load Explore update requests");return response.json()}
export async function reviewAdminExploreOwnerUpdate(id:number,action:"approve"|"reject",approvedFields:string[],adminNotes:string,adminPassword:string):Promise<import("./types").ExploreOwnerUpdate>{const response=await apiFetch(`/api/admin/explore-update-requests/${id}/review`,{method:"POST",headers:{"Content-Type":"application/json",...getAdminHeaders(adminPassword)},body:JSON.stringify({action,approved_fields:approvedFields,admin_notes:adminNotes})});if(!response.ok)throw new Error((await response.json().catch(()=>null))?.detail||"Unable to review Explore updates");return response.json()}
export async function getAdminExploreDestinations(adminPassword:string):Promise<import("./types").AdminExploreDestination[]>{const response=await apiFetch("/api/admin/explore-destinations",{cache:"no-store",headers:getAdminHeaders(adminPassword)});if(!response.ok)throw new Error("Unable to load Explore destinations");return response.json()}
export async function createAdminExploreDestination(payload:Record<string,unknown>,adminPassword:string){const response=await apiFetch("/api/admin/explore-destinations",{method:"POST",headers:{"Content-Type":"application/json",...getAdminHeaders(adminPassword)},body:JSON.stringify(payload)});if(!response.ok)throw new Error((await response.json().catch(()=>null))?.detail||"Unable to create destination");return response.json()}
export async function updateAdminExploreDestination(id:number,payload:Record<string,unknown>,adminPassword:string){const response=await apiFetch(`/api/admin/explore-destinations/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json",...getAdminHeaders(adminPassword)},body:JSON.stringify(payload)});if(!response.ok)throw new Error((await response.json().catch(()=>null))?.detail||"Unable to update destination");return response.json()}
export async function reviewAdminExploreSubmission(kind:"photos"|"reports",id:number,action:string,adminPassword:string){const response=await apiFetch(`/api/admin/explore-${kind}/${id}/review`,{method:"POST",headers:{"Content-Type":"application/json",...getAdminHeaders(adminPassword)},body:JSON.stringify({action})});if(!response.ok)throw new Error("Unable to review submission");return response.json()}

export async function suggestExploreDestination(payload: Record<string, unknown>, riderToken = "") { const response = await apiFetch("/api/explore/suggestions", { method: "POST", headers: { "Content-Type": "application/json", "X-Rider-Token": riderToken }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(response.status===401?"Rider signup is required.":"Unable to submit this place"); return response.json(); }
export async function submitExplorePhoto(slug: string, payload: Record<string, string>, riderToken = "") { const response = await apiFetch(`/api/explore/${encodeURIComponent(slug)}/photos`, { method: "POST", headers: { "Content-Type": "application/json", "X-Rider-Token": riderToken }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(response.status===401?"Rider signup is required.":"Unable to submit this photo"); return response.json(); }
export async function reportExploreDestination(slug: string, payload: Record<string, string>, riderToken = "") { const response = await apiFetch(`/api/explore/${encodeURIComponent(slug)}/reports`, { method: "POST", headers: { "Content-Type": "application/json", "X-Rider-Token": riderToken }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(response.status===401?"Rider signup is required.":"Unable to submit this report"); return response.json(); }
