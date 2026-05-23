import { sampleBusinesses } from "./sample-data";
import type {
  Business,
  Campaign,
  CampaignCreateInput,
  BusinessCreateInput,
  BusinessModerationInput,
  BusinessUpdateInput,
  Category,
  Deal,
  DealCreateInput,
  DealUpdateInput,
  LodgingServiceRequest,
  LodgingServiceRequestCreateInput,
  MarketingLead,
  MarketingLeadCreateInput,
  TrailReview,
  TrailReviewCreateInput,
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
    status: review.status,
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
): Promise<{ access_url: string; email_sent: boolean; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/businesses/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner_email: ownerEmail }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to find business");
  }

  return response.json();
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
    throw new Error("Unable to create checkout");
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
