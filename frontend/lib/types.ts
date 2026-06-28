export type Category = "lodging" | "food" | "rentals" | "repairs" | "fuel" | "deals";

export type Deal = {
  id: number;
  title: string;
  code: string;
  description: string;
  is_active: boolean;
  claim_clicks: number;
};

export type Campaign = {
  id: number;
  business_id: number;
  campaign_type: string;
  title: string;
  description: string;
  target_area: string;
  monthly_budget: number;
  status: "pending" | "active" | "paused" | "expired";
  impressions: number;
  clicks: number;
};

export type LodgingServiceRequest = {
  id: number;
  business_id: number;
  service_type: string;
  property_name: string;
  property_location: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  date_needed: string;
  notes: string;
  status: "new" | "contacted" | "matched" | "closed";
};

export type MarketingLead = {
  id: number;
  lead_type: "launch_access" | "business_availability";
  email: string;
  business_name: string;
  category: string;
  area: string;
  phone: string;
  website: string;
  source: string;
  notes: string;
  status: "new" | "contacted" | "converted" | "closed";
};

export type MarketingLeadCreateInput = Omit<MarketingLead, "id" | "status">;

export type AdminEmailTestResult = {
  sent: boolean;
  message: string;
  to: string;
  from: string;
};

export type Business = {
  id: number;
  name: string;
  slug: string;
  category: Category;
  description: string;
  phone: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  photo_url: string;
  website_url: string;
  owner_email?: string;
  owner_access_token?: string;
  listing_status: "pending" | "approved" | "needs_changes" | "rejected" | "unpublished";
  admin_notes: string;
  subscription_tier: string;
  subscription_status: "trialing" | "active" | "past_due" | "canceled" | "incomplete";
  stripe_customer_id: string;
  stripe_subscription_id: string;
  is_approved: boolean;
  is_featured: boolean;
  view_clicks: number;
  action_clicks: number;
  deals: Deal[];
  campaigns: Campaign[];
  service_requests?: LodgingServiceRequest[];
};

export type BusinessCreateInput = {
  name: string;
  slug: string;
  category: Exclude<Category, "deals">;
  description: string;
  phone: string;
  location: string;
  latitude?: number;
  longitude?: number;
  photo_url: string;
  website_url: string;
  subscription_tier: Tier["id"];
  owner_email: string;
};

export type BusinessUpdateInput = Partial<
  Pick<
    Business,
    | "name"
    | "category"
    | "description"
    | "phone"
    | "location"
    | "latitude"
    | "longitude"
    | "photo_url"
    | "website_url"
    | "subscription_tier"
    | "owner_email"
  >
>;

export type GeocodeResult = {
  display_name: string;
  latitude: number;
  longitude: number;
};

export type BusinessModerationInput = {
  listing_status: Business["listing_status"];
  admin_notes: string;
};

export type DealCreateInput = {
  business_id: number;
  title: string;
  code: string;
  description: string;
  is_active: boolean;
};

export type DealUpdateInput = Partial<
  Pick<Deal, "title" | "code" | "description" | "is_active">
>;

export type CampaignCreateInput = {
  business_id: number;
  campaign_type: string;
  title: string;
  description: string;
  target_area: string;
  monthly_budget: number;
};

export type LodgingServiceRequestCreateInput = Omit<LodgingServiceRequest, "id" | "status">;

export type Tier = {
  id: "local_business" | "lodging_partner" | "veteran_owned";
  name: string;
  price: string;
  description: string;
  features: string[];
};

export type RideArea = {
  slug: string;
  name: string;
  state: string;
  locationQuery: string;
  latitude: number;
  longitude: number;
  headline: string;
  description: string;
  bestFor: string[];
  nearbyTowns: string[];
  checklist: string[];
  trails: TrailInfo[];
};

export type TrailInfo = {
  name: string;
  type: string;
  difficulty: "Easy" | "Moderate" | "Hard" | "Mixed";
  activity?: "OHV" | "Hiking" | "Multi-use";
  access: string;
  description: string;
  url: string;
  passUrl?: string;
  latitude?: number;
  longitude?: number;
  lengthMiles?: number;
  photoStops?: TrailPhotoStop[];
  routeLine?: TrailCoordinate[];
};

export type TrailCoordinate = {
  latitude: number;
  longitude: number;
};

export type TrailPhotoStop = TrailCoordinate & {
  name: string;
  note: string;
};

export type TrailReview = {
  id: number;
  areaSlug: string;
  riderName: string;
  rating: number;
  rideDate: string;
  machine: string;
  difficulty: "Easy" | "Moderate" | "Hard";
  trailCondition: string;
  comment: string;
  status?: "pending" | "approved" | "rejected";
};

export type TrailReviewCreateInput = Omit<TrailReview, "id" | "status">;

export type TrailTalkCategory =
  | "group_ride"
  | "trail_conditions"
  | "events"
  | "buy_sell_trade"
  | "help_repairs"
  | "lodging_food"
  | "heroes_rides";

export type TrailTalkPost = {
  id: number;
  rider_name: string;
  email?: string;
  category: TrailTalkCategory;
  area_slug: string;
  ride_date: string;
  title: string;
  message: string;
  status: "pending" | "approved" | "rejected";
};

export type TrailTalkPostCreateInput = Omit<TrailTalkPost, "id" | "status">;
