"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addDeal,
  addListingCalendar,
  approveBooking,
  createCampaign,
  createBookableListing,
  createLodgingServiceRequest,
  createStripeConnectOnboarding,
  decideBookingCancellation,
  deleteDeal,
  geocodeLocation,
  getListings,
  syncListingCalendar,
  updateBusiness,
  updateDeal,
} from "../lib/api";
import type {
  BookableListingCreateInput,
  Business,
  BusinessUpdateInput,
  CampaignCreateInput,
  Category,
} from "../lib/types";

type Props = {
  initialBusinesses: Business[];
};

const categories: Exclude<Category, "deals">[] = [
  "lodging",
  "food",
  "rentals",
  "repairs",
  "fuel",
];

const tiers = [
  { id: "local_business", label: "$29 local business" },
  { id: "lodging_partner", label: "$59 lodging partner" },
  { id: "veteran_owned", label: "$0.00 veteran owned" },
] as const;

function getActiveTier(tier: string) {
  return tiers.some((item) => item.id === tier) ? tier : tiers[0].id;
}

type ListingForm = {
  name: string;
  category: Exclude<Category, "deals">;
  description: string;
  phone: string;
  location: string;
  latitude: string;
  longitude: string;
  photo_url: string;
  website_url: string;
  owner_email: string;
  subscription_tier: string;
};

function toListingForm(business: Business): ListingForm {
  return {
    name: business.name,
    category: business.category === "deals" ? "food" : business.category,
    description: business.description,
    phone: business.phone,
    location: business.location,
    latitude: business.latitude?.toString() || "",
    longitude: business.longitude?.toString() || "",
    photo_url: business.photo_url,
    website_url: business.website_url,
    owner_email: business.owner_email || "",
    subscription_tier: getActiveTier(business.subscription_tier),
  };
}

function emptyDealForm() {
  return {
    title: "",
    code: "",
    description: "",
  };
}

function emptyServiceForm(business?: Business) {
  return {
    service_type: "Cleaner / turnover help",
    property_name: business?.name || "",
    property_location: business?.location || "",
    contact_name: "",
    contact_phone: business?.phone || "",
    contact_email: business?.owner_email || "",
    date_needed: "",
    notes: "",
  };
}

function emptyBookableForm(business?: Business) {
  return {
    title: business?.name || "",
    listing_type: business?.category === "rentals" ? "rental" : business?.category === "lodging" ? "lodging" : "service",
    description: "",
    location: business?.location || "",
    photo_url: business?.photo_url || "",
    nightly_rate: "",
    cleaning_fee: "",
    max_guests: "4",
    cancellation_window_hours: "72",
    cancellation_policy:
      "Guests may request cancellation before check-in. We review each request based on timing, property rules, and whether dates can be rebooked.",
    refund_policy:
      "Approved cancellations may receive a full or partial refund. Non-refundable fees and late cancellations may not qualify.",
    payout_timing: "after_check_in",
    payment_timing: "at_booking",
  };
}

function emptyCalendarForm() {
  return {
    listing_id: "",
    provider: "Airbnb",
    ical_url: "",
  };
}

function parseCoordinate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const coordinate = Number(trimmed);
  return Number.isFinite(coordinate) ? coordinate : undefined;
}

function dollarsToCents(value: string) {
  const amount = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function centsToDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

type RefundMode = "full" | "minus_cleaning_fee" | "half" | "none" | "custom";
type DashboardPanel =
  | "listing"
  | "deals"
  | "stats"
  | "bookingSetup"
  | "bookable"
  | "calendar"
  | "bookings"
  | "service"
  | "partners";

function emptyPartnerDealForm() {
  return {
    title: "",
    partner_business: "",
    offer: "",
    target_area: "",
  };
}

export function BusinessDashboard({ initialBusinesses }: Props) {
  const [businesses, setBusinesses] = useState(initialBusinesses);
  const [selectedId, setSelectedId] = useState(initialBusinesses[0]?.id ?? 0);
  const selectedBusiness = businesses.find((business) => business.id === selectedId);
  const [listingForm, setListingForm] = useState(
    selectedBusiness ? toListingForm(selectedBusiness) : null,
  );
  const [dealForm, setDealForm] = useState(emptyDealForm);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm(selectedBusiness));
  const [bookableForm, setBookableForm] = useState(emptyBookableForm(selectedBusiness));
  const [calendarForm, setCalendarForm] = useState(emptyCalendarForm);
  const [partnerDealForm, setPartnerDealForm] = useState(emptyPartnerDealForm);
  const [preferredServiceBusinessId, setPreferredServiceBusinessId] = useState("");
  const [serviceDirectory, setServiceDirectory] = useState<Business[]>([]);
  const [activePanel, setActivePanel] = useState<DashboardPanel>("listing");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [geocodeStatus, setGeocodeStatus] = useState("");
  const [savingListing, setSavingListing] = useState(false);
  const [savingDeal, setSavingDeal] = useState(false);
  const [savingServiceRequest, setSavingServiceRequest] = useState(false);
  const [savingBookable, setSavingBookable] = useState(false);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [savingPartnerDeal, setSavingPartnerDeal] = useState(false);
  const [syncingCalendarId, setSyncingCalendarId] = useState(0);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [refundChoices, setRefundChoices] = useState<Record<number, { mode: RefundMode; customAmount: string }>>({});

  useEffect(() => {
    let isMounted = true;
    getListings("all")
      .then((listings) => {
        if (isMounted) setServiceDirectory(listings);
      })
      .catch(() => {
        if (isMounted) setServiceDirectory([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    const dealClicks =
      selectedBusiness?.deals.reduce((sum, deal) => sum + deal.claim_clicks, 0) ?? 0;

    return {
      views: selectedBusiness?.view_clicks ?? 0,
      actions: selectedBusiness?.action_clicks ?? 0,
      deals: dealClicks,
      properties: selectedBusiness?.bookable_listings?.length ?? 0,
    };
  }, [selectedBusiness]);

  const setupItems = useMemo(() => {
    if (!selectedBusiness) return [];
    const listings = selectedBusiness.bookable_listings || [];
    const hasCalendar = listings.some((listing) => listing.calendars.length > 0);
    const hasPolicy = listings.some(
      (listing) => listing.cancellation_policy.trim() && listing.refund_policy.trim(),
    );
    const profileComplete = Boolean(
      selectedBusiness.name &&
        selectedBusiness.description &&
        selectedBusiness.phone &&
        selectedBusiness.location &&
        selectedBusiness.photo_url,
    );

    return [
      {
        done: profileComplete,
        label: "Profile complete",
        detail: "Business name, phone, location, photo, and description are ready.",
        panel: "listing" as DashboardPanel,
      },
      {
        done: selectedBusiness.stripe_connect_onboarding_complete,
        label: "Stripe payouts connected",
        detail: "Connect payouts before taking paid bookings.",
        panel: "bookingSetup" as DashboardPanel,
      },
      {
        done: listings.length > 0,
        label: "Property or bookable item added",
        detail: "Add each cabin, RV site, rental, guide service, event, or local service.",
        panel: "bookable" as DashboardPanel,
      },
      {
        done: hasCalendar,
        label: "Calendar linked",
        detail: "Sync Airbnb, Vrbo, Booking.com, Google Calendar, or any iCal feed.",
        panel: "calendar" as DashboardPanel,
      },
      {
        done: hasPolicy,
        label: "Refund policy set",
        detail: "Cancellation and refund rules help riders know what to expect.",
        panel: "bookable" as DashboardPanel,
      },
      {
        done: selectedBusiness.deals.some((deal) => deal.is_active),
        label: "Deal or coupon added",
        detail: "Optional, but a launch special gives riders a reason to act.",
        panel: "deals" as DashboardPanel,
      },
      {
        done: selectedBusiness.listing_status === "approved",
        label: "Approved for marketplace",
        detail: "Admin approval makes the listing public.",
        panel: "listing" as DashboardPanel,
      },
    ];
  }, [selectedBusiness]);

  const setupCompleteCount = setupItems.filter((item) => item.done).length;
  const setupPercent = setupItems.length ? Math.round((setupCompleteCount / setupItems.length) * 100) : 0;
  const pendingBookings = selectedBusiness?.bookings?.filter((booking) => booking.status === "requested").length ?? 0;
  const pendingCancellations =
    selectedBusiness?.bookings?.filter((booking) => booking.refund_status === "requested").length ?? 0;
  const activeServiceRequests =
    selectedBusiness?.service_requests?.filter((request) => request.status !== "closed").length ?? 0;
  const pendingPartnerDeals =
    selectedBusiness?.campaigns?.filter((campaign) => campaign.campaign_type === "joint_discount" && campaign.status === "pending").length ?? 0;
  const attentionItems = [
    pendingBookings
      ? { label: "Booking requests", count: pendingBookings, panel: "bookings" as DashboardPanel }
      : null,
    pendingCancellations
      ? { label: "Cancellation reviews", count: pendingCancellations, panel: "bookings" as DashboardPanel }
      : null,
    activeServiceRequests
      ? { label: "Service requests", count: activeServiceRequests, panel: "service" as DashboardPanel }
      : null,
    !selectedBusiness?.stripe_connect_onboarding_complete
      ? { label: "Payout setup", count: 1, panel: "bookingSetup" as DashboardPanel }
      : null,
  ].filter(Boolean) as { label: string; count: number; panel: DashboardPanel }[];
  const notificationCount = attentionItems.reduce((sum, item) => sum + item.count, 0);
  const panelButtons = [
    { id: "listing" as DashboardPanel, label: "Profile & Contact", count: 0 },
    { id: "deals" as DashboardPanel, label: "Specials", count: selectedBusiness?.deals.filter((deal) => deal.is_active).length ?? 0 },
    { id: "stats" as DashboardPanel, label: "Clicks", count: 0 },
    { id: "bookingSetup" as DashboardPanel, label: "Payouts", count: selectedBusiness?.stripe_connect_onboarding_complete ? 0 : 1 },
    { id: "bookable" as DashboardPanel, label: "Bookable Items", count: selectedBusiness?.bookable_listings?.length ?? 0 },
    { id: "calendar" as DashboardPanel, label: "Calendars", count: 0 },
    { id: "bookings" as DashboardPanel, label: "Booking Requests", count: pendingBookings + pendingCancellations },
    { id: "service" as DashboardPanel, label: "Service Requests", count: activeServiceRequests },
    { id: "partners" as DashboardPanel, label: "Partner Deals", count: pendingPartnerDeals },
  ];

  function chooseBusiness(nextId: number) {
    const nextBusiness = businesses.find((business) => business.id === nextId);
    setSelectedId(nextId);
    setListingForm(nextBusiness ? toListingForm(nextBusiness) : null);
    setDealForm(emptyDealForm());
    setServiceForm(emptyServiceForm(nextBusiness));
    setBookableForm(emptyBookableForm(nextBusiness));
    setCalendarForm(emptyCalendarForm());
    setPartnerDealForm(emptyPartnerDealForm());
    setPreferredServiceBusinessId("");
    setActivePanel("listing");
    setStatus("");
    setError("");
    setGeocodeStatus("");
  }

  function replaceBusiness(updatedBusiness: Business) {
    setBusinesses((current) =>
      current.map((business) =>
        business.id === updatedBusiness.id ? updatedBusiness : business,
      ),
    );
  }

  function useUploadedPhoto(file?: File) {
    if (!file || !listingForm) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setListingForm({ ...listingForm, photo_url: reader.result });
      }
    };
    reader.readAsDataURL(file);
  }

  async function saveListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBusiness || !listingForm) return;

    setSavingListing(true);
    setError("");
    setStatus("");

    try {
      const latitude = parseCoordinate(listingForm.latitude);
      const longitude = parseCoordinate(listingForm.longitude);
      const hasLatitude = Boolean(listingForm.latitude.trim());
      const hasLongitude = Boolean(listingForm.longitude.trim());

      if (
        hasLatitude !== hasLongitude ||
        (hasLatitude && latitude === undefined) ||
        (hasLongitude && longitude === undefined)
      ) {
        setError("Enter both valid latitude and longitude numbers, or leave both blank.");
        return;
      }

      const payload: BusinessUpdateInput = {
        ...listingForm,
        latitude,
        longitude,
      };

      const updatedBusiness = await updateBusiness(
        selectedBusiness.id,
        payload,
        selectedBusiness.owner_access_token,
      );
      replaceBusiness(updatedBusiness);
      setListingForm(toListingForm(updatedBusiness));
      setStatus("Listing saved.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to save listing.",
      );
    } finally {
      setSavingListing(false);
    }
  }

  async function findListingCoordinates() {
    if (!listingForm) return;
    setError("");
    setGeocodeStatus("");
    if (!listingForm.location.trim()) {
      setError("Enter a location or address before finding coordinates.");
      return;
    }

    setGeocodeStatus("Finding coordinates...");
    try {
      const result = await geocodeLocation(listingForm.location.trim());
      setListingForm({
        ...listingForm,
        latitude: result.latitude.toFixed(6),
        longitude: result.longitude.toFixed(6),
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

  async function publishDeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBusiness) return;

    setSavingDeal(true);
    setError("");
    setStatus("");

    try {
      const deal = await addDeal(
        {
          business_id: selectedBusiness.id,
          title: dealForm.title,
          code: dealForm.code,
          description: dealForm.description,
          is_active: true,
        },
        selectedBusiness.owner_access_token,
      );
      const updatedBusiness = {
        ...selectedBusiness,
        deals: [deal, ...selectedBusiness.deals],
      };
      replaceBusiness(updatedBusiness);
      setDealForm(emptyDealForm());
      setStatus("Deal published.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to add deal.");
    } finally {
      setSavingDeal(false);
    }
  }

  async function toggleDeal(dealId: number, isActive: boolean) {
    if (!selectedBusiness) return;
    setError("");
    try {
      const deal = await updateDeal(
        selectedBusiness.id,
        dealId,
        {
          is_active: !isActive,
        },
        selectedBusiness.owner_access_token,
      );
      replaceBusiness({
        ...selectedBusiness,
        deals: selectedBusiness.deals.map((item) =>
          item.id === deal.id ? deal : item,
        ),
      });
      setStatus(deal.is_active ? "Special activated." : "Special paused.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update special.");
    }
  }

  async function removeDeal(dealId: number) {
    if (!selectedBusiness) return;
    setError("");
    try {
      await deleteDeal(selectedBusiness.id, dealId, selectedBusiness.owner_access_token);
      replaceBusiness({
        ...selectedBusiness,
        deals: selectedBusiness.deals.filter((deal) => deal.id !== dealId),
      });
      setStatus("Special deleted.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to delete special.");
    }
  }

  async function requestLodgingService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBusiness) return;

    setSavingServiceRequest(true);
    setError("");
    setStatus("");
    const preferredProvider = serviceDirectory.find(
      (business) => business.id.toString() === preferredServiceBusinessId,
    );

    try {
      const serviceRequest = await createLodgingServiceRequest(
        {
          business_id: selectedBusiness.id,
          ...serviceForm,
          notes: [
            preferredProvider
              ? `Preferred provider: ${preferredProvider.name} (${preferredProvider.phone}, ${preferredProvider.owner_email || "no owner email"})`
              : "",
            serviceForm.notes,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
        selectedBusiness.owner_access_token,
      );
      replaceBusiness({
        ...selectedBusiness,
        service_requests: [serviceRequest, ...(selectedBusiness.service_requests || [])],
      });
      setServiceForm(emptyServiceForm(selectedBusiness));
      setPreferredServiceBusinessId("");
      setStatus(
        preferredProvider
          ? `Service request sent with ${preferredProvider.name} marked as preferred.`
          : "Service request sent. We will connect you with local options.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to request lodging service help.",
      );
    } finally {
      setSavingServiceRequest(false);
    }
  }

  async function publishPartnerDeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBusiness) return;

    setSavingPartnerDeal(true);
    setError("");
    setStatus("");

    try {
      const payload: CampaignCreateInput = {
        business_id: selectedBusiness.id,
        campaign_type: "joint_discount",
        title: partnerDealForm.title,
        description: [
          `Partner business: ${partnerDealForm.partner_business}`,
          `Shared rider offer: ${partnerDealForm.offer}`,
        ].join("\n"),
        target_area: partnerDealForm.target_area,
        monthly_budget: 0,
      };
      const campaign = await createCampaign(payload, selectedBusiness.owner_access_token);
      replaceBusiness({
        ...selectedBusiness,
        campaigns: [campaign, ...(selectedBusiness.campaigns || [])],
      });
      setPartnerDealForm(emptyPartnerDealForm());
      setStatus("Partner deal request saved for admin review.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save partner deal request.",
      );
    } finally {
      setSavingPartnerDeal(false);
    }
  }

  async function connectStripePayouts() {
    if (!selectedBusiness) return;
    setConnectingStripe(true);
    setError("");
    setStatus("");
    try {
      const connectResult = await createStripeConnectOnboarding(
        selectedBusiness.id,
        selectedBusiness.owner_access_token,
      );
      replaceBusiness({
        ...selectedBusiness,
        stripe_connect_account_id: connectResult.stripe_connect_account_id,
        stripe_connect_onboarding_complete:
          connectResult.onboarding_url.includes("connect=stub") ||
          selectedBusiness.stripe_connect_onboarding_complete,
      });
      window.location.href = connectResult.onboarding_url;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to connect Stripe payouts.",
      );
      setConnectingStripe(false);
    }
  }

  async function publishBookableListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBusiness) return;
    setSavingBookable(true);
    setError("");
    setStatus("");

    try {
      const payload: BookableListingCreateInput = {
        title: bookableForm.title,
        listing_type: bookableForm.listing_type as BookableListingCreateInput["listing_type"],
        description: bookableForm.description,
        location: bookableForm.location,
        photo_url: bookableForm.photo_url,
        nightly_rate_cents: dollarsToCents(bookableForm.nightly_rate),
        cleaning_fee_cents: dollarsToCents(bookableForm.cleaning_fee),
        max_guests: Number(bookableForm.max_guests) || 1,
        cancellation_window_hours: Number(bookableForm.cancellation_window_hours) || 72,
        cancellation_policy: bookableForm.cancellation_policy,
        refund_policy: bookableForm.refund_policy,
        payout_timing: bookableForm.payout_timing as BookableListingCreateInput["payout_timing"],
        payment_timing: bookableForm.payment_timing as BookableListingCreateInput["payment_timing"],
        is_active: true,
      };
      const listing = await createBookableListing(
        selectedBusiness.id,
        payload,
        selectedBusiness.owner_access_token,
      );
      replaceBusiness({
        ...selectedBusiness,
        bookable_listings: [listing, ...(selectedBusiness.bookable_listings || [])],
      });
      setBookableForm(emptyBookableForm(selectedBusiness));
      setCalendarForm({ ...emptyCalendarForm(), listing_id: String(listing.id) });
      setStatus("Property added to this account. Add an iCal calendar next if it has outside bookings.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to add property.",
      );
    } finally {
      setSavingBookable(false);
    }
  }

  async function addCalendarLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBusiness || !calendarForm.listing_id) return;
    setSavingCalendar(true);
    setError("");
    setStatus("");

    try {
      const calendar = await addListingCalendar(
        selectedBusiness.id,
        Number(calendarForm.listing_id),
        {
          provider: calendarForm.provider,
          ical_url: calendarForm.ical_url,
          is_active: true,
        },
        selectedBusiness.owner_access_token,
      );
      replaceBusiness({
        ...selectedBusiness,
        bookable_listings: (selectedBusiness.bookable_listings || []).map((listing) =>
          listing.id === calendar.listing_id
            ? { ...listing, calendars: [calendar, ...listing.calendars] }
            : listing,
        ),
      });
      setCalendarForm(emptyCalendarForm());
      setStatus("Calendar link added. Availability sync can use this iCal feed.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to add calendar.");
    } finally {
      setSavingCalendar(false);
    }
  }

  async function syncCalendarLink(listingId: number, calendarId: number) {
    if (!selectedBusiness) return;
    setSyncingCalendarId(calendarId);
    setError("");
    setStatus("");

    try {
      const calendar = await syncListingCalendar(
        selectedBusiness.id,
        listingId,
        calendarId,
        selectedBusiness.owner_access_token,
      );
      replaceBusiness({
        ...selectedBusiness,
        bookable_listings: (selectedBusiness.bookable_listings || []).map((listing) =>
          listing.id === listingId
            ? {
                ...listing,
                calendars: listing.calendars.map((item) =>
                  item.id === calendar.id ? calendar : item,
                ),
              }
            : listing,
        ),
      });
      setStatus(calendar.last_sync_status);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to sync calendar.");
    } finally {
      setSyncingCalendarId(0);
    }
  }

  async function approveBookingRequest(bookingId: number) {
    if (!selectedBusiness) return;
    setError("");
    setStatus("");
    try {
      const booking = await approveBooking(
        selectedBusiness.id,
        bookingId,
        selectedBusiness.owner_access_token,
      );
      replaceBusiness({
        ...selectedBusiness,
        bookings: (selectedBusiness.bookings || []).map((item) =>
          item.id === booking.id ? booking : item,
        ),
      });
      setStatus("Booking approved. Next step is sending the rider bundled checkout.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to approve booking.");
    }
  }

  async function updateCancellationRequest(bookingId: number, approved: boolean) {
    if (!selectedBusiness) return;
    const refundChoice = refundChoices[bookingId] || { mode: "full" as RefundMode, customAmount: "" };
    setError("");
    setStatus("");
    try {
      const booking = await decideBookingCancellation(
        selectedBusiness.id,
        bookingId,
        {
          approved,
          note: approved
            ? "Cancellation approved by the business."
            : "Cancellation declined by the business.",
          refund_mode: approved ? refundChoice.mode : "none",
          custom_refund_cents: approved ? dollarsToCents(refundChoice.customAmount) : 0,
        },
        selectedBusiness.owner_access_token,
      );
      replaceBusiness({
        ...selectedBusiness,
        bookings: (selectedBusiness.bookings || []).map((item) =>
          item.id === booking.id ? booking : item,
        ),
      });
      setStatus(approved ? "Cancellation approved." : "Cancellation declined.");
      setRefundChoices((current) => {
        const next = { ...current };
        delete next[bookingId];
        return next;
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update cancellation request.",
      );
    }
  }

  if (!selectedBusiness || !listingForm) {
    return (
      <section className="dashboard-grid">
        <div className="empty-state">No businesses are available yet.</div>
      </section>
    );
  }

  return (
    <section className="business-dashboard-shell">
      <div className="business-switcher">
        <label>
          Managing
          <select
            value={selectedId}
            onChange={(event) => chooseBusiness(Number(event.target.value))}
          >
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span>{selectedBusiness.listing_status.replaceAll("_", " ")}</span>
          <span>{selectedBusiness.is_featured ? "Featured" : "Standard placement"}</span>
          <span>{selectedBusiness.subscription_status.replaceAll("_", " ")}</span>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {status ? <p className="form-success">{status}</p> : null}
      {geocodeStatus ? <p className="form-success">{geocodeStatus}</p> : null}
      {selectedBusiness.admin_notes ? (
        <p className="form-error">{selectedBusiness.admin_notes}</p>
      ) : null}

      <section className="dashboard-card setup-checklist-card">
        <div className="setup-checklist-head">
          <div>
            <p className="eyebrow">Setup guide</p>
            <h2>Get this business booking-ready</h2>
          </div>
          <strong>{setupPercent}%</strong>
        </div>
        <div className="setup-progress-track" aria-hidden="true">
          <span style={{ width: `${setupPercent}%` }} />
        </div>
        <div className="setup-checklist-grid">
          {setupItems.map((item) => (
            <button
              className={`${item.done ? "is-complete" : ""} ${activePanel === item.panel ? "is-active" : ""}`}
              key={item.label}
              onClick={() => setActivePanel(item.panel)}
              type="button"
            >
              <span>{item.done ? "Done" : "Next"}</span>
              <h3>{item.label}</h3>
              <p>{item.detail}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-card business-alert-card">
        <div>
          <p className="eyebrow">Needs attention</p>
          <h2>
            Notifications
            {notificationCount ? <span className="notification-dot">{notificationCount}</span> : null}
          </h2>
        </div>
        <div className="business-alert-list">
          {attentionItems.length ? (
            attentionItems.map((item) => (
              <button key={item.label} type="button" onClick={() => setActivePanel(item.panel)}>
                <strong>{item.count}</strong>
                <span>{item.label}</span>
              </button>
            ))
          ) : (
            <p>No active booking, service, or payout alerts.</p>
          )}
        </div>
      </section>

      <section className="dashboard-card business-workspace-card">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2>Open one tool at a time</h2>
        </div>
        <div className="business-panel-buttons">
          {panelButtons.map((button) => (
            <button
              className={activePanel === button.id ? "is-active" : ""}
              key={button.id}
              onClick={() => setActivePanel(button.id)}
              type="button"
            >
              <span>{button.label}</span>
              {button.count ? <strong>{button.count}</strong> : null}
            </button>
          ))}
        </div>
      </section>

      <div className="dashboard-grid business-dashboard-grid">
        {activePanel === "listing" ? (
        <form className="dashboard-card" onSubmit={saveListing}>
          <h2>Profile & Contact</h2>
          <p className="field-help">
            This email is the business login email. This phone is the public contact
            number and the number to use for booking or service text alerts once SMS is connected.
          </p>
          <label>
            Business name
            <input
              required
              value={listingForm.name}
              onChange={(event) =>
                setListingForm({ ...listingForm, name: event.target.value })
              }
            />
          </label>
          <label>
            Owner email
            <input
              required
              type="email"
              value={listingForm.owner_email}
              onChange={(event) =>
                setListingForm({ ...listingForm, owner_email: event.target.value })
              }
            />
          </label>
          <label>
            Category
            <select
              value={listingForm.category}
              onChange={(event) =>
                setListingForm({
                  ...listingForm,
                  category: event.target.value as Exclude<Category, "deals">,
                })
              }
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            Phone
            <input
              required
              value={listingForm.phone}
              onChange={(event) =>
                setListingForm({ ...listingForm, phone: event.target.value })
              }
            />
          </label>
          <label>
            Location
            <input
              required
              value={listingForm.location}
              onChange={(event) =>
                setListingForm({ ...listingForm, location: event.target.value })
              }
            />
          </label>
          <div className="coordinate-grid">
            <label>
              Latitude
              <input
                inputMode="decimal"
                placeholder="37.6223"
                value={listingForm.latitude}
                onChange={(event) =>
                  setListingForm({ ...listingForm, latitude: event.target.value })
                }
              />
            </label>
            <label>
              Longitude
              <input
                inputMode="decimal"
                placeholder="-82.1571"
                value={listingForm.longitude}
                onChange={(event) =>
                  setListingForm({ ...listingForm, longitude: event.target.value })
                }
              />
            </label>
          </div>
          <p className="field-help">
            Add coordinates to show this business as a pin in Rider Tools.
          </p>
          <button className="secondary-action" type="button" onClick={findListingCoordinates}>
            Find Coordinates From Location
          </button>
          <label>
            Website
            <input
              value={listingForm.website_url}
              onChange={(event) =>
                setListingForm({ ...listingForm, website_url: event.target.value })
              }
            />
          </label>
          <label>
            Photo
            <input
              accept="image/*"
              type="file"
              onChange={(event) => useUploadedPhoto(event.target.files?.[0])}
            />
            <small className="field-help">
              Upload a listing photo, or paste a direct image URL below.
            </small>
          </label>
          <label>
            Photo URL
            <input
              required
              value={listingForm.photo_url.startsWith("data:image/") ? "Uploaded photo selected" : listingForm.photo_url}
              onChange={(event) =>
                setListingForm({ ...listingForm, photo_url: event.target.value })
              }
            />
          </label>
          <label>
            Partner tier
            <select
              value={listingForm.subscription_tier}
              onChange={(event) =>
                setListingForm({
                  ...listingForm,
                  subscription_tier: event.target.value,
                })
              }
            >
              {tiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Description
            <textarea
              required
              value={listingForm.description}
              onChange={(event) =>
                setListingForm({
                  ...listingForm,
                  description: event.target.value,
                })
              }
            />
          </label>
          <button type="submit" disabled={savingListing}>
            {savingListing ? "Saving" : "Save Listing"}
          </button>
        </form>
        ) : null}

        {activePanel === "deals" ? (
        <form className="dashboard-card" onSubmit={publishDeal}>
          <h2>Specials / Coupons</h2>
          <label>
            Deal title
            <input
              required
              value={dealForm.title}
              onChange={(event) =>
                setDealForm({ ...dealForm, title: event.target.value })
              }
            />
          </label>
          <label>
            Coupon code
            <input
              value={dealForm.code}
              onChange={(event) =>
                setDealForm({ ...dealForm, code: event.target.value.toUpperCase() })
              }
            />
          </label>
          <label>
            Description
            <textarea
              required
              value={dealForm.description}
              onChange={(event) =>
                setDealForm({ ...dealForm, description: event.target.value })
              }
            />
          </label>
          <button type="submit" disabled={savingDeal}>
            {savingDeal ? "Publishing" : "Publish Deal"}
          </button>

          <div className="deal-list">
            <h3>Current Specials</h3>
            {selectedBusiness.deals.length ? (
              selectedBusiness.deals.map((deal) => (
                <article key={deal.id}>
                  <strong>{deal.title}</strong>
                  <span>{deal.is_active ? deal.code || "No code" : "Paused"}</span>
                  <p>{deal.description}</p>
                  <div className="mini-actions">
                    <button
                      type="button"
                      onClick={() => toggleDeal(deal.id, deal.is_active)}
                    >
                      {deal.is_active ? "Pause" : "Activate"}
                    </button>
                    <button type="button" onClick={() => removeDeal(deal.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p>No deals published yet.</p>
            )}
          </div>
        </form>
        ) : null}

        {activePanel === "stats" ? (
        <section className="dashboard-card stats-card">
          <h2>Basic Clicks</h2>
          <div>
            <strong>{totals.views}</strong>
            <span>Listing views</span>
          </div>
          <div>
            <strong>{totals.actions}</strong>
            <span>Calls / deal clicks</span>
          </div>
          <div>
            <strong>{totals.deals}</strong>
            <span>Coupon claims</span>
          </div>
          <div>
            <strong>{totals.properties}</strong>
            <span>Properties / bookables</span>
          </div>
          <a href={`/business/${selectedBusiness.slug}`}>View public listing</a>
        </section>
        ) : null}

        {activePanel === "bookingSetup" ? (
        <section className="dashboard-card booking-dashboard-card">
          <h2>Property Booking Setup</h2>
          <p className="field-help">
            Keep every cabin, RV site, rental, guide service, or event under this
            one business account. Add each property below, then attach its own
            calendar links and booking requests.
          </p>
          <div className="booking-status-row">
            <span>
              Stripe Connect:{" "}
              {selectedBusiness.stripe_connect_onboarding_complete
                ? "Connected"
                : selectedBusiness.stripe_connect_account_id
                  ? "Started"
                  : "Not connected"}
            </span>
            <button type="button" onClick={connectStripePayouts} disabled={connectingStripe}>
              {connectingStripe ? "Opening..." : "Connect Stripe Payouts"}
            </button>
          </div>
        </section>
        ) : null}

        {activePanel === "bookable" ? (
        <form className="dashboard-card" onSubmit={publishBookableListing}>
          <h2>Add Property / Booking Item</h2>
          <p className="field-help">
            Add as many properties or bookable services as this business owns.
            They will all stay under this same login.
          </p>
          <label>
            Property / item name
            <input
              required
              value={bookableForm.title}
              onChange={(event) => setBookableForm({ ...bookableForm, title: event.target.value })}
            />
          </label>
          <label>
            Booking type
            <select
              value={bookableForm.listing_type}
              onChange={(event) =>
                setBookableForm({ ...bookableForm, listing_type: event.target.value })
              }
            >
              <option value="lodging">Cabin / lodging</option>
              <option value="camping">Campground / RV site</option>
              <option value="rental">Rental</option>
              <option value="guide">Guide</option>
              <option value="event">Event</option>
              <option value="service">Local service</option>
            </select>
          </label>
          <label>
            Location
            <input
              value={bookableForm.location}
              onChange={(event) => setBookableForm({ ...bookableForm, location: event.target.value })}
            />
          </label>
          <div className="coordinate-grid">
            <label>
              Nightly / base price
              <input
                inputMode="decimal"
                placeholder="149"
                value={bookableForm.nightly_rate}
                onChange={(event) =>
                  setBookableForm({ ...bookableForm, nightly_rate: event.target.value })
                }
              />
            </label>
            <label>
              Cleaning / add-on fee
              <input
                inputMode="decimal"
                placeholder="75"
                value={bookableForm.cleaning_fee}
                onChange={(event) =>
                  setBookableForm({ ...bookableForm, cleaning_fee: event.target.value })
                }
              />
            </label>
          </div>
          <label>
            Max guests
            <input
              inputMode="numeric"
              value={bookableForm.max_guests}
              onChange={(event) =>
                setBookableForm({ ...bookableForm, max_guests: event.target.value })
              }
            />
          </label>
          <label>
            Cancellation window
            <select
              value={bookableForm.cancellation_window_hours}
              onChange={(event) =>
                setBookableForm({ ...bookableForm, cancellation_window_hours: event.target.value })
              }
            >
              <option value="24">24 hours before check-in</option>
              <option value="48">48 hours before check-in</option>
              <option value="72">72 hours before check-in</option>
              <option value="168">7 days before check-in</option>
              <option value="336">14 days before check-in</option>
            </select>
          </label>
          <label>
            When customers pay
            <select
              value={bookableForm.payment_timing}
              onChange={(event) =>
                setBookableForm({ ...bookableForm, payment_timing: event.target.value })
              }
            >
              <option value="at_booking">Charge when booking is confirmed</option>
              <option value="after_cancellation_period">Charge after cancellation period</option>
            </select>
          </label>
          <small className="field-help">
            Business payout is scheduled for the day after check-in once payment
            is complete.
          </small>
          <label>
            Photo URL
            <input
              value={bookableForm.photo_url}
              onChange={(event) =>
                setBookableForm({ ...bookableForm, photo_url: event.target.value })
              }
            />
          </label>
          <label>
            Description
            <textarea
              value={bookableForm.description}
              onChange={(event) =>
                setBookableForm({ ...bookableForm, description: event.target.value })
              }
            />
          </label>
          <label>
            Cancellation policy
            <textarea
              value={bookableForm.cancellation_policy}
              onChange={(event) =>
                setBookableForm({ ...bookableForm, cancellation_policy: event.target.value })
              }
            />
          </label>
          <label>
            Refund policy
            <textarea
              value={bookableForm.refund_policy}
              onChange={(event) =>
                setBookableForm({ ...bookableForm, refund_policy: event.target.value })
              }
            />
          </label>
          <button type="submit" disabled={savingBookable}>
            {savingBookable ? "Adding..." : "Add Property"}
          </button>
        </form>
        ) : null}

        {activePanel === "calendar" ? (
        <form className="dashboard-card" onSubmit={addCalendarLink}>
          <h2>Calendar Sync</h2>
          <p className="field-help">
            Paste Airbnb, Vrbo, Booking.com, Google Calendar, or any iCal link.
          </p>
          <label>
            Property / item
            <select
              required
              value={calendarForm.listing_id}
              onChange={(event) =>
                setCalendarForm({ ...calendarForm, listing_id: event.target.value })
              }
            >
              <option value="">Choose property</option>
              {(selectedBusiness.bookable_listings || []).map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {listing.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Calendar provider
            <select
              value={calendarForm.provider}
              onChange={(event) =>
                setCalendarForm({ ...calendarForm, provider: event.target.value })
              }
            >
              <option>Airbnb</option>
              <option>Vrbo</option>
              <option>Booking.com</option>
              <option>Google Calendar</option>
              <option>Other iCal</option>
            </select>
          </label>
          <label>
            iCal URL
            <input
              required
              value={calendarForm.ical_url}
              onChange={(event) =>
                setCalendarForm({ ...calendarForm, ical_url: event.target.value })
              }
              placeholder="https://.../calendar.ics"
            />
          </label>
          <button type="submit" disabled={savingCalendar || !selectedBusiness.bookable_listings?.length}>
            {savingCalendar ? "Saving..." : "Add Calendar Link"}
          </button>

          <div className="deal-list">
            <h3>Properties on this account</h3>
            {selectedBusiness.bookable_listings?.length ? (
              selectedBusiness.bookable_listings.map((listing) => (
                <article key={listing.id}>
                  <strong>{listing.title}</strong>
                  <span>{centsToDollars(listing.nightly_rate_cents)} base</span>
                  <p>
                    {listing.listing_type} • {listing.calendars.length} calendar link
                    {listing.calendars.length === 1 ? "" : "s"}
                  </p>
                  <p>
                    {listing.cancellation_window_hours} hour cancellation window • payout day after check-in
                  </p>
                  {listing.calendars.length ? (
                    <div className="calendar-sync-list">
                      {listing.calendars.map((calendar) => (
                        <div key={calendar.id}>
                          <span>
                            {calendar.provider}: {calendar.last_sync_status}
                          </span>
                          <button
                            type="button"
                            onClick={() => syncCalendarLink(listing.id, calendar.id)}
                            disabled={syncingCalendarId === calendar.id}
                          >
                            {syncingCalendarId === calendar.id ? "Syncing" : "Sync"}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <p>No properties added yet.</p>
            )}
          </div>
        </form>
        ) : null}

        {activePanel === "bookings" ? (
        <section className="dashboard-card">
          <h2>Booking Requests</h2>
          <div className="deal-list">
            {selectedBusiness.bookings?.length ? (
              selectedBusiness.bookings.map((booking) => (
                <article key={booking.id}>
                  <strong>{booking.customer_name}</strong>
                  <span>{booking.status.replaceAll("_", " ")}</span>
                  <p>
                    {booking.start_date} to {booking.end_date} • {booking.guests} guest
                    {booking.guests === 1 ? "" : "s"} • {centsToDollars(booking.total_cents)}
                  </p>
                  {booking.payout_release_date ? (
                    <p>Payout release date: {booking.payout_release_date}</p>
                  ) : null}
                  {booking.refund_status === "requested" ? (
                    <div className="alert-inline">
                      <strong>Cancellation requested</strong>
                      <p>{booking.cancellation_reason || "No reason provided."}</p>
                      <label>
                        Refund decision
                        <select
                          value={refundChoices[booking.id]?.mode || "full"}
                          onChange={(event) =>
                            setRefundChoices({
                              ...refundChoices,
                              [booking.id]: {
                                mode: event.target.value as RefundMode,
                                customAmount: refundChoices[booking.id]?.customAmount || "",
                              },
                            })
                          }
                        >
                          <option value="full">Full refund</option>
                          <option value="minus_cleaning_fee">Refund minus cleaning fee</option>
                          <option value="half">50% refund</option>
                          <option value="none">No refund, cancel only</option>
                          <option value="custom">Custom amount</option>
                        </select>
                      </label>
                      {(refundChoices[booking.id]?.mode || "full") === "custom" ? (
                        <label>
                          Custom refund amount
                          <input
                            inputMode="decimal"
                            placeholder="125.00"
                            value={refundChoices[booking.id]?.customAmount || ""}
                            onChange={(event) =>
                              setRefundChoices({
                                ...refundChoices,
                                [booking.id]: {
                                  mode: "custom",
                                  customAmount: event.target.value,
                                },
                              })
                            }
                          />
                        </label>
                      ) : null}
                      <div className="mini-actions">
                        <button
                          type="button"
                          onClick={() => updateCancellationRequest(booking.id, true)}
                        >
                          Approve Cancellation
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCancellationRequest(booking.id, false)}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ) : booking.refund_status !== "not_requested" ? (
                    <p>
                      Cancellation review: {booking.refund_status.replaceAll("_", " ")}
                      {booking.refunded_cents
                        ? ` • refunded ${centsToDollars(booking.refunded_cents)}`
                        : ""}
                      {booking.refund_failure_reason
                        ? ` • ${booking.refund_failure_reason}`
                        : ""}
                    </p>
                  ) : null}
                  {booking.status === "requested" ? (
                    <div className="mini-actions">
                      <button type="button" onClick={() => approveBookingRequest(booking.id)}>
                        Approve Request
                      </button>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <p>No booking requests yet.</p>
            )}
          </div>
        </section>
        ) : null}

        {activePanel === "service" && selectedBusiness.category === "lodging" ? (
          <form className="dashboard-card" onSubmit={requestLodgingService}>
            <h2>Lodging Help</h2>
            <p className="field-help">
              Request cleaner, turnover, laundry, hot tub, trash, lawn, or
              maintenance help from local service providers.
            </p>
            <label>
              Preferred provider
              <select
                value={preferredServiceBusinessId}
                onChange={(event) => setPreferredServiceBusinessId(event.target.value)}
              >
                <option value="">No preference / find best match</option>
                {serviceDirectory
                  .filter((business) => business.id !== selectedBusiness.id)
                  .map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name} - {business.category} - {business.location}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Service needed
              <select
                value={serviceForm.service_type}
                onChange={(event) =>
                  setServiceForm({ ...serviceForm, service_type: event.target.value })
                }
              >
                <option>Cleaner / turnover help</option>
                <option>Laundry help</option>
                <option>Hot tub service</option>
                <option>Trash haul-off</option>
                <option>Maintenance / handyman</option>
                <option>Lawn care</option>
                <option>Emergency turnover help</option>
              </select>
            </label>
            <label>
              Property name
              <input
                value={serviceForm.property_name}
                onChange={(event) =>
                  setServiceForm({ ...serviceForm, property_name: event.target.value })
                }
              />
            </label>
            <label>
              Property location
              <input
                required
                value={serviceForm.property_location}
                onChange={(event) =>
                  setServiceForm({ ...serviceForm, property_location: event.target.value })
                }
              />
            </label>
            <label>
              Date needed
              <input
                placeholder="This weekend, every Monday, June 14..."
                value={serviceForm.date_needed}
                onChange={(event) =>
                  setServiceForm({ ...serviceForm, date_needed: event.target.value })
                }
              />
            </label>
            <label>
              Contact name
              <input
                value={serviceForm.contact_name}
                onChange={(event) =>
                  setServiceForm({ ...serviceForm, contact_name: event.target.value })
                }
              />
            </label>
            <label>
              Contact phone
              <input
                required
                value={serviceForm.contact_phone}
                onChange={(event) =>
                  setServiceForm({ ...serviceForm, contact_phone: event.target.value })
                }
              />
            </label>
            <label>
              Contact email
              <input
                required
                type="email"
                value={serviceForm.contact_email}
                onChange={(event) =>
                  setServiceForm({ ...serviceForm, contact_email: event.target.value })
                }
              />
            </label>
            <label>
              Notes
              <textarea
                placeholder="Number of beds, bathrooms, hot tub, same-day turnover, supplies, recurring schedule..."
                value={serviceForm.notes}
                onChange={(event) =>
                  setServiceForm({ ...serviceForm, notes: event.target.value })
                }
              />
            </label>
            <button type="submit" disabled={savingServiceRequest}>
              {savingServiceRequest ? "Sending..." : "Request Lodging Help"}
            </button>

            <div className="deal-list">
              <h3>Requests</h3>
              {selectedBusiness.service_requests?.length ? (
                selectedBusiness.service_requests.map((request) => (
                  <article key={request.id}>
                    <strong>{request.service_type}</strong>
                    <span>{request.status}</span>
                    <p>{request.property_location}</p>
                  </article>
                ))
              ) : (
                <p>No lodging help requests yet.</p>
              )}
            </div>
          </form>
        ) : null}

        {activePanel === "partners" ? (
          <form className="dashboard-card" onSubmit={publishPartnerDeal}>
            <h2>Partner Deals</h2>
            <p className="field-help">
              Create a shared rider discount with another local business. Admin can
              review and help connect both sides before it goes live.
            </p>
            <label>
              Deal title
              <input
                required
                placeholder="Cabin + dinner weekend bundle"
                value={partnerDealForm.title}
                onChange={(event) =>
                  setPartnerDealForm({ ...partnerDealForm, title: event.target.value })
                }
              />
            </label>
            <label>
              Partner business
              <input
                required
                list="business-partner-options"
                placeholder="Business name"
                value={partnerDealForm.partner_business}
                onChange={(event) =>
                  setPartnerDealForm({ ...partnerDealForm, partner_business: event.target.value })
                }
              />
              <datalist id="business-partner-options">
                {serviceDirectory
                  .filter((business) => business.id !== selectedBusiness.id)
                  .map((business) => (
                    <option key={business.id} value={business.name} />
                  ))}
              </datalist>
            </label>
            <label>
              Shared rider offer
              <textarea
                required
                placeholder="Example: riders who book a cabin get 10% off dinner, and dinner customers get a cabin promo code."
                value={partnerDealForm.offer}
                onChange={(event) =>
                  setPartnerDealForm({ ...partnerDealForm, offer: event.target.value })
                }
              />
            </label>
            <label>
              Ride area / town
              <input
                value={partnerDealForm.target_area}
                onChange={(event) =>
                  setPartnerDealForm({ ...partnerDealForm, target_area: event.target.value })
                }
              />
            </label>
            <button type="submit" disabled={savingPartnerDeal}>
              {savingPartnerDeal ? "Saving..." : "Request Partner Deal"}
            </button>

            <div className="deal-list">
              <h3>Joint discount requests</h3>
              {selectedBusiness.campaigns?.filter((campaign) => campaign.campaign_type === "joint_discount").length ? (
                selectedBusiness.campaigns
                  .filter((campaign) => campaign.campaign_type === "joint_discount")
                  .map((campaign) => (
                    <article key={campaign.id}>
                      <strong>{campaign.title}</strong>
                      <span>{campaign.status}</span>
                      <p>{campaign.description}</p>
                    </article>
                  ))
              ) : (
                <p>No partner deal requests yet.</p>
              )}
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}
