import { sampleBusinesses } from "./sample-data";
import type {
  AdminEmailTestResult,
  AdminAnalytics,
  Business,
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
  BusinessReviewCreateInput,
  Rider,
  RiderRideCard,
  RiderTrailProgress,
  RiderTrailProgressCreateInput,
  TrailConditionReport,
  TrailConditionReportCreateInput,
  TrailReview,
  TrailReviewCreateInput,
  TrailTalkPost,
  TrailTalkPostCreateInput,
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

function shouldSkipApiDuringBuild() {
  return typeof window === "undefined" && process.env.SKIP_API_DURING_BUILD === "1";
}

type ListingFilters = {
  category?: Category | "all";
  location?: string;
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
  if (shouldSkipApiDuringBuild()) {
    if (!category || category === "all") return sampleBusinesses;
    if (category === "deals") return sampleBusinesses.filter((business) => business.deals.length > 0);
    return sampleBusinesses.filter((business) => business.category === category);
  }
  if (category) params.set("category", category);
  if (location) params.set("location", location);

  try {
    const response = await apiFetch(`/api/listings?${params.toString()}`, {
      cache: "no-store",
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
  try {
    const response = await apiFetch(`/api/businesses/access/${ownerAccessToken}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
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
  payload: { owner_email: string; phone_last4: string; subscription_tier: string },
): Promise<Business> {
  const response = await fetch(`${getApiUrl()}/api/businesses/${businessId}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to verify business ownership");
  }

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

export async function getAdminBusinesses(adminPassword?: string): Promise<Business[]> {
  const response = await fetch(`${getApiUrl()}/api/admin/businesses`, {
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
    throw new Error(`Unable to load admin businesses. API returned ${response.status}.`);
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
