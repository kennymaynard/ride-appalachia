"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  addDeal,
  addListingCalendar,
  approveBooking,
  createBookableListing,
  createLodgingServiceRequest,
  createStripeConnectOnboarding,
  deleteDeal,
  geocodeLocation,
  syncListingCalendar,
  updateBusiness,
  updateDeal,
} from "../lib/api";
import type { BookableListingCreateInput, Business, BusinessUpdateInput, Category } from "../lib/types";

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
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [geocodeStatus, setGeocodeStatus] = useState("");
  const [savingListing, setSavingListing] = useState(false);
  const [savingDeal, setSavingDeal] = useState(false);
  const [savingServiceRequest, setSavingServiceRequest] = useState(false);
  const [savingBookable, setSavingBookable] = useState(false);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [syncingCalendarId, setSyncingCalendarId] = useState(0);
  const [connectingStripe, setConnectingStripe] = useState(false);

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

  function chooseBusiness(nextId: number) {
    const nextBusiness = businesses.find((business) => business.id === nextId);
    setSelectedId(nextId);
    setListingForm(nextBusiness ? toListingForm(nextBusiness) : null);
    setDealForm(emptyDealForm());
    setServiceForm(emptyServiceForm(nextBusiness));
    setBookableForm(emptyBookableForm(nextBusiness));
    setCalendarForm(emptyCalendarForm());
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

    try {
      const serviceRequest = await createLodgingServiceRequest(
        {
          business_id: selectedBusiness.id,
          ...serviceForm,
        },
        selectedBusiness.owner_access_token,
      );
      replaceBusiness({
        ...selectedBusiness,
        service_requests: [serviceRequest, ...(selectedBusiness.service_requests || [])],
      });
      setServiceForm(emptyServiceForm(selectedBusiness));
      setStatus("Lodging service request sent. We will connect you with cleaner options.");
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

      <div className="dashboard-grid business-dashboard-grid">
        <form className="dashboard-card" onSubmit={saveListing}>
          <h2>Edit Listing</h2>
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
          <button type="submit" disabled={savingBookable}>
            {savingBookable ? "Adding..." : "Add Property"}
          </button>
        </form>

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

        {selectedBusiness.category === "lodging" ? (
          <form className="dashboard-card" onSubmit={requestLodgingService}>
            <h2>Lodging Help</h2>
            <p className="field-help">
              Request cleaner, turnover, laundry, hot tub, trash, lawn, or
              maintenance help from local service providers.
            </p>
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
      </div>
    </section>
  );
}
