export type Category = "lodging" | "food" | "rentals" | "repairs" | "fuel" | "services" | "deals";

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

export type ListingCalendar = {
  id: number;
  listing_id: number;
  provider: string;
  ical_url: string;
  is_active: boolean;
  last_synced_at?: string | null;
  last_sync_status: string;
};

export type BookableListing = {
  id: number;
  business_id: number;
  title: string;
  listing_type: "lodging" | "camping" | "rental" | "guide" | "event" | "service";
  description: string;
  location: string;
  photo_url: string;
  nightly_rate_cents: number;
  cleaning_fee_cents: number;
  tax_rate_basis_points: number;
  max_guests: number;
  cancellation_window_hours: number;
  cancellation_policy: string;
  refund_policy: string;
  payout_timing: "after_check_in" | "on_payment";
  payment_timing: "at_booking" | "after_cancellation_period";
  is_active: boolean;
  calendars: ListingCalendar[];
};

export type BookableListingCreateInput = Omit<BookableListing, "id" | "business_id" | "calendars">;

export type Booking = {
  id: number;
  listing_id: number;
  business_id: number;
  rider_id?: number | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  start_date: string;
  end_date: string;
  guests: number;
  message: string;
  status: "requested" | "approved" | "checkout_sent" | "paid" | "declined" | "canceled";
  subtotal_cents: number;
  cleaning_fee_cents: number;
  taxes_cents: number;
  platform_fee_cents: number;
  total_cents: number;
  stripe_checkout_session_id: string;
  cancellation_requested_at?: string | null;
  cancellation_reason: string;
  cancellation_decision_at?: string | null;
  cancellation_decision_note: string;
  refund_status: "not_requested" | "requested" | "approved" | "declined" | "processed" | "refund_failed";
  refunded_cents: number;
  stripe_refund_id: string;
  refund_failure_reason: string;
  payout_release_date: string;
};

export type BookingDetail = Booking & {
  business_name: string;
  business_address: string;
  listing_title: string;
  cancellation_window_hours: number;
  cancellation_policy: string;
  refund_policy: string;
  payment_timing: "at_booking" | "after_cancellation_period";
};

export type BookingTransfer = {
  id: number;
  booking_id: number;
  business_id: number;
  stripe_transfer_id: string;
  amount_cents: number;
  status: "pending" | "scheduled_after_checkin" | "paid" | "failed" | "missing_connect_account" | "canceled";
  release_date: string;
};

export type StoreOrder = {
  id: number;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_cents: number;
  currency: string;
  status: string;
  items: string;
  shipping_name: string;
  shipping_address: string;
  printify_submitted: boolean;
  printify_order_id: string;
  printify_message: string;
  created_at: string;
};

export type AdminRiderAccount = Rider & {
  completed_trails: number;
  saved_trails: number;
  badge_count: number;
  partner_visits: number;
  created_at?: string | null;
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
  email_sent?: boolean;
  email_message?: string;
  sms_sent?: boolean;
  sms_message?: string;
};

export type MarketingLeadCreateInput = Omit<MarketingLead, "id" | "status">;

export type PlannerShareInput = {
  destination: string;
  plan: string;
  email?: string;
  phone?: string;
};

export type PlannerShareResult = {
  email_sent: boolean;
  email_message: string;
  sms_sent: boolean;
  sms_message: string;
};

export type AdminSmsTestResult = {
  sent: boolean;
  message: string;
  to: string;
};

export type AdminEmailTestResult = {
  sent: boolean;
  message: string;
  to: string;
  from: string;
  payload?: {
    from: string;
    to: string[];
    subject: string;
    text?: string;
    html?: string;
  };
  response_status?: number | null;
  response_body?: string;
  resend_key?: {
    length: number;
    starts: string;
    ends: string;
    sha256: string;
    has_spaces: boolean;
  };
};

export type AdminAnalytics = {
  rider_count: number;
  business_count: number;
  page_visits: number;
  connected_stripe_accounts: number;
  not_connected_stripe_accounts: number;
  pending_verification_stripe_accounts: number;
  platform_revenue_cents: number;
  gross_booking_volume_cents: number;
  platform_fee_collected_cents: number;
  bookings_count: number;
  failed_payments_count: number;
  rider_locations: Array<{
    label: string;
    latitude: number;
    longitude: number;
    riders: number;
  }>;
  top_paths: Array<{
    path: string;
    visits: number;
  }>;
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
  stripe_connect_account_id: string;
  stripe_connect_charges_enabled: boolean;
  stripe_connect_payouts_enabled: boolean;
  stripe_connect_business_name: string;
  stripe_connect_business_email: string;
  stripe_connect_onboarding_complete: boolean;
  partner_tax_agreement_accepted: boolean;
  partner_tax_agreement_accepted_at?: string | null;
  is_approved: boolean;
  is_featured: boolean;
  is_deleted?: boolean;
  deleted_at?: string | null;
  view_clicks: number;
  action_clicks: number;
  deals: Deal[];
  campaigns: Campaign[];
  service_requests?: LodgingServiceRequest[];
  bookable_listings?: BookableListing[];
  bookings?: Booking[];
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
  owner_passcode: string;
  partner_tax_agreement_accepted?: boolean;
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
> & {
  owner_passcode?: string;
};

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
  nearbyOutdoors: OutdoorStop[];
  mapFeatures: RideMapFeature[];
  trails: TrailInfo[];
};

export type RideMapFeature = TrailCoordinate & {
  id: string;
  areaSlug: string;
  areaName: string;
  title: string;
  layer:
    | "condition"
    | "cell"
    | "parking"
    | "difficulty"
    | "emergency"
    | "scenic"
    | "offline"
    | "group"
    | "passport"
    | "deal";
  summary: string;
  detail: string;
  status?: string;
  updatedAt?: string;
  vehicleTypes?: Array<"ATV" | "SxS" | "Jeep" | "Dirt bike" | "Beginner" | "Family">;
  url?: string;
};

export type OutdoorStop = {
  name: string;
  kind: "state_park" | "campground" | "photo_spot" | "waterfall" | "nature";
  description: string;
  access: string;
  url: string;
  latitude?: number;
  longitude?: number;
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
  mapDataUrl?: string;
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
  photoUrl: string;
  photoCaption: string;
  status?: "pending" | "approved" | "rejected";
};

export type TrailReviewCreateInput = Omit<TrailReview, "id" | "status">;

export type TrailConditionReport = {
  id: number;
  areaSlug: string;
  trailName: string;
  riderName: string;
  reportType:
    | "muddy"
    | "dusty"
    | "closed"
    | "washed_out"
    | "downed_tree"
    | "weak_cell"
    | "trailer_warning"
    | "crowded"
    | "clear";
  severity: "low" | "moderate" | "high" | "closed";
  note: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: "pending" | "approved" | "rejected";
};

export type TrailConditionReportCreateInput = Omit<TrailConditionReport, "id" | "status">;

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

export type RiderActivity = "ohv" | "hiking" | "run" | "walk";

export type RiderBadge = {
  id: number;
  badge_key: string;
  label: string;
  category: "trail" | "hiking" | "run" | "walk" | "community" | "partner" | string;
  earned_at: string;
};

export type RiderTrailProgress = {
  id: number;
  rider_id: number;
  area_slug: string;
  trail_name: string;
  activity: RiderActivity;
  status: "saved" | "completed";
  source: "manual" | "track_me" | string;
  is_group_ride: boolean;
  distance_miles?: number | null;
  completed_at?: string | null;
};

export type RiderTrailProgressCreateInput = Omit<
  RiderTrailProgress,
  "id" | "rider_id" | "completed_at"
>;

export type Rider = {
  id: number;
  display_name: string;
  email: string;
  phone: string;
  home_location: string;
  home_latitude?: number | null;
  home_longitude?: number | null;
  veteran_verification_status: "unverified" | "pending" | "verified" | "rejected";
  veteran_verification_notes: string;
  veteran_document_name: string;
  alert_phone_opt_in: boolean;
  alert_email_opt_in: boolean;
  storm_alerts_enabled: boolean;
  trail_alerts_enabled: boolean;
  access_token: string;
  badges: RiderBadge[];
  progress: RiderTrailProgress[];
  created_at?: string | null;
};

export type RiderRideCard = {
  rider: Rider;
  completed_trails: number;
  completed_hikes: number;
  completed_runs: number;
  completed_walks: number;
  partner_visits: number;
  badges: RiderBadge[];
};

export type BusinessReviewCreateInput = {
  business_id: number;
  rider_name: string;
  rating: number;
  comment: string;
};

export type StoreCheckoutItemInput = {
  product_id: string;
  name: string;
  variant: string;
  dropship_sku: string;
  unit_amount_cents: number;
  quantity: number;
};

export type StoreCheckoutInput = {
  items: StoreCheckoutItemInput[];
  customer_email?: string;
};
