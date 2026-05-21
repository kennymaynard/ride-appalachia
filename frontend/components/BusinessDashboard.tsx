"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  addDeal,
  createCampaign,
  createCheckout,
  createLodgingServiceRequest,
  deleteDeal,
  updateBusiness,
  updateDeal,
} from "../lib/api";
import type { Business, Category } from "../lib/types";

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
  { id: "featured_partner", label: "$99 featured partner" },
] as const;

type ListingForm = {
  name: string;
  category: Exclude<Category, "deals">;
  description: string;
  phone: string;
  location: string;
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
    photo_url: business.photo_url,
    website_url: business.website_url,
    owner_email: business.owner_email || "",
    subscription_tier: business.subscription_tier,
  };
}

function emptyDealForm() {
  return {
    title: "",
    code: "",
    description: "",
  };
}

function emptyCampaignForm() {
  return {
    title: "Monthly Appalachia Offroad Sponsorship",
    description: "Featured placement for riders planning trips this month.",
    target_area: "",
    monthly_budget: 149,
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

export function BusinessDashboard({ initialBusinesses }: Props) {
  const [businesses, setBusinesses] = useState(initialBusinesses);
  const [selectedId, setSelectedId] = useState(initialBusinesses[0]?.id ?? 0);
  const selectedBusiness = businesses.find((business) => business.id === selectedId);
  const [listingForm, setListingForm] = useState(
    selectedBusiness ? toListingForm(selectedBusiness) : null,
  );
  const [dealForm, setDealForm] = useState(emptyDealForm);
  const [campaignForm, setCampaignForm] = useState(emptyCampaignForm);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm(selectedBusiness));
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [savingListing, setSavingListing] = useState(false);
  const [savingDeal, setSavingDeal] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [savingServiceRequest, setSavingServiceRequest] = useState(false);

  const totals = useMemo(() => {
    const dealClicks =
      selectedBusiness?.deals.reduce((sum, deal) => sum + deal.claim_clicks, 0) ?? 0;

    return {
      views: selectedBusiness?.view_clicks ?? 0,
      actions: selectedBusiness?.action_clicks ?? 0,
      deals: dealClicks,
    };
  }, [selectedBusiness]);

  function chooseBusiness(nextId: number) {
    const nextBusiness = businesses.find((business) => business.id === nextId);
    setSelectedId(nextId);
    setListingForm(nextBusiness ? toListingForm(nextBusiness) : null);
    setDealForm(emptyDealForm());
    setServiceForm(emptyServiceForm(nextBusiness));
    setStatus("");
    setError("");
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
      const updatedBusiness = await updateBusiness(
        selectedBusiness.id,
        listingForm,
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

  async function launchCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBusiness) return;

    setSavingCampaign(true);
    setError("");
    setStatus("");

    try {
      const campaign = await createCampaign(
        {
          business_id: selectedBusiness.id,
          campaign_type: "monthly_sponsor",
          ...campaignForm,
        },
        selectedBusiness.owner_access_token,
      );
      replaceBusiness({
        ...selectedBusiness,
        campaigns: [campaign, ...selectedBusiness.campaigns],
      });
      const checkoutUrl = await createCheckout(
        "monthly_sponsor",
        selectedBusiness.id,
        selectedBusiness.owner_access_token,
      );
      window.location.href = checkoutUrl;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to start campaign.");
      setSavingCampaign(false);
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
          <a href={`/business/${selectedBusiness.slug}`}>View public listing</a>
        </section>

        {selectedBusiness.category === "lodging" ? (
          <form className="dashboard-card" onSubmit={requestLodgingService}>
            <h2>Lodging Help</h2>
            <p className="field-help">
              Request cleaner, turnover, laundry, hot tub, trash, lawn, or
              maintenance help. Cleaners pay Appalachia Offroad $29.99/month for
              unlimited cleaning opportunities. No per-clean cut.
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

        <form className="dashboard-card" onSubmit={launchCampaign}>
          <h2>Monthly Sponsorship</h2>
          <p className="field-help">
            $149/month sponsorship for ride-area/category visibility. Campaigns
            start pending until admin approval.
          </p>
          <label>
            Campaign title
            <input
              required
              value={campaignForm.title}
              onChange={(event) =>
                setCampaignForm({ ...campaignForm, title: event.target.value })
              }
            />
          </label>
          <label>
            Ride area / target
            <input
              placeholder="Rush KY, Inez KY, Matewan WV..."
              value={campaignForm.target_area}
              onChange={(event) =>
                setCampaignForm({ ...campaignForm, target_area: event.target.value })
              }
            />
          </label>
          <label>
            Campaign message
            <textarea
              required
              value={campaignForm.description}
              onChange={(event) =>
                setCampaignForm({
                  ...campaignForm,
                  description: event.target.value,
                })
              }
            />
          </label>
          <button type="submit" disabled={savingCampaign}>
            {savingCampaign ? "Starting Checkout..." : "Start $149 Sponsorship"}
          </button>

          <div className="deal-list">
            <h3>Campaigns</h3>
            {selectedBusiness.campaigns.length ? (
              selectedBusiness.campaigns.map((campaign) => (
                <article key={campaign.id}>
                  <strong>{campaign.title}</strong>
                  <span>{campaign.status}</span>
                  <p>
                    {campaign.target_area || "All areas"} · ${campaign.monthly_budget}/mo
                  </p>
                </article>
              ))
            ) : (
              <p>No sponsorship campaigns yet.</p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
