"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createMarketingLead, createStoreCheckout, getStoreProducts } from "../lib/api";
import {
  formatPhoneNumber,
  isValidPhoneNumber,
  normalizeWebsiteUrl,
} from "../lib/contact-format";
import type { StoreProduct } from "../lib/store-products";

type CartItem = {
  productId: string;
  name: string;
  variant: string;
  dropshipSku: string;
  unitAmountCents: number;
  quantity: number;
};

const DESCRIPTION_PREVIEW_LENGTH = 120;

const approvedPrices = {
  shirt: 2600,
  case: 1800,
  tank: 2200,
  tumbler: 2800,
  hat: 2800,
  flag: 1500,
};

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function productKind(product: StoreProduct): keyof typeof approvedPrices | null {
  const text = normalizeText(`${product.name} ${product.category} ${product.badge} ${product.visual}`);
  if (text.includes("phone") || text.includes("case")) return "case";
  if (text.includes("tank")) return "tank";
  if (text.includes("tumbler") || text.includes("drinkware")) return "tumbler";
  if (text.includes("hat") || text.includes("cap")) return "hat";
  if (text.includes("flag")) return "flag";
  if (text.includes("shirt") || text.includes("tee")) return "shirt";
  return null;
}

function approvedImages(product: StoreProduct) {
  if (productKind(product) !== "shirt") {
    return product.imageUrls || [];
  }

  const text = normalizeText(product.name);
  if (text.includes("appalachia offroad t shirt ride hard plan less graphic")) {
    return [
      "/images/store/appalachia-offroad-ride-hard-shirt-grid.png",
      "/images/store/ride-hard-plan-less-shirt-lifestyle.png",
    ];
  }
  if (text.includes("ride hard plan less t shirt")) {
    return [
      "/images/store/ride-hard-plan-less-shirt-lifestyle.png",
      "/images/store/appalachia-offroad-ride-hard-shirt-grid.png",
    ];
  }
  if (text.includes("appalachia offroad logo t shirt hero")) {
    return ["/images/store/hero-verified-shirt-lifestyle.png"];
  }
  if (
    text.includes("appalachia off road t shirt mountain sunset") ||
    text.includes("appalachia offroad t shirt mountain atv sunset")
  ) {
    return [
      "/images/store/appalachia-offroad-shirt-lifestyle.png",
      "/images/store/appalachia-offroad-ride-hard-shirt-grid.png",
    ];
  }
  if (text.includes("hero")) {
    return ["/images/store/hero-verified-shirt-lifestyle.png"];
  }
  if (text.includes("ride hard") || text.includes("plan less") || text.includes("rhpl")) {
    return [
      "/images/store/ride-hard-plan-less-shirt-lifestyle.png",
      "/images/store/appalachia-offroad-ride-hard-shirt-grid.png",
    ];
  }
  if (text.includes("appalachia") || text.includes("appalachian")) {
    return [
      "/images/store/appalachia-offroad-shirt-lifestyle.png",
      "/images/store/appalachia-offroad-ride-hard-shirt-grid.png",
    ];
  }
  return product.imageUrls || [];
}

type DisplayMeta = {
  key: string;
  name: string;
  description: string;
  order: number;
  hidden?: boolean;
};

function displayMeta(product: StoreProduct): DisplayMeta {
  const text = normalizeText(product.name);
  const kind = productKind(product);

  if (kind === null) {
    return {
      key: `hidden-${product.id}`,
      name: product.name,
      description: product.description,
      order: 99,
      hidden: true,
    };
  }

  if (text.includes("sticker")) {
    return {
      key: `hidden-${product.id}`,
      name: product.name,
      description: product.description,
      order: 99,
      hidden: true,
    };
  }

  if (kind === "tumbler" && text.includes("hero verified")) {
    return {
      key: `hidden-${product.id}`,
      name: product.name,
      description: product.description,
      order: 99,
      hidden: true,
    };
  }

  if (text.includes("appalachia offroad t shirt ride hard plan less graphic")) {
    return {
      key: "ride-hard-plan-less-shirt",
      name: "Ride Hard Plan Less Shirt",
      description: "Black trail tee with Ride Hard Plan Less artwork and Appalachia Offroad back print.",
      order: 1,
    };
  }

  if (text.includes("ride hard plan less t shirt")) {
    return {
      key: "ride-hard-plan-less-shirt",
      name: "Ride Hard Plan Less Shirt",
      description: "Black trail tee with Ride Hard Plan Less artwork and Appalachia Offroad back print.",
      order: 1,
    };
  }

  if (text.includes("appalachia offroad logo t shirt hero")) {
    return {
      key: "hero-verified-shirt",
      name: "Hero Verified Shirt",
      description: "Black tee with the Hero Verified badge and Appalachia Offroad back artwork.",
      order: 2,
    };
  }

  if (kind === "shirt" && (text.includes("ride hard") || text.includes("plan less"))) {
    return {
      key: "ride-hard-plan-less-shirt",
      name: "Ride Hard Plan Less Shirt",
      description: "Black trail tee with Ride Hard Plan Less artwork and Appalachia Offroad back print.",
      order: 1,
    };
  }

  if (kind === "shirt" && (text.includes("hero") || text.includes("verified"))) {
    return {
      key: "hero-verified-shirt",
      name: "Hero Verified Shirt",
      description: "Black tee with the Hero Verified badge and Appalachia Offroad back artwork.",
      order: 2,
    };
  }

  if (kind === "shirt") {
    return {
      key: "appalachia-offroad-shirt",
      name: "Appalachia Offroad Shirt",
      description: "Black Appalachia Offroad tee with mountain, ATV, and sunset trail artwork.",
      order: 0,
    };
  }

  if (kind === "tank") {
    return {
      key: "appalachia-offroad-tank",
      name: "Appalachia Offroad Tank",
      description: "Lightweight tank top with Appalachia Offroad mountain trail artwork.",
      order: 3,
    };
  }

  if (kind === "case") {
    return {
      key: "appalachia-offroad-phone-case",
      name: "Appalachia Phone Case",
      description: "Protective phone case with Appalachia Offroad mountain and ATV artwork.",
      order: 4,
    };
  }

  if (kind === "tumbler") {
    return {
      key: "appalachia-offroad-tumbler",
      name: "Appalachia Tumbler",
      description: "20 oz insulated tumbler with Appalachia Offroad trail artwork.",
      order: 5,
    };
  }

  if (kind === "hat") {
    return {
      key: "appalachia-offroad-hat",
      name: "Appalachia Hat",
      description: "Trail-ready Appalachia Offroad hat with an adjustable fit.",
      order: 6,
    };
  }

  return {
    key: "appalachia-offroad-garden-flag",
    name: "Appalachia Garden Flag",
    description: "Outdoor garden flag with Appalachia Offroad mountain and ATV artwork.",
    order: 7,
  };
}

function applyStoreOverrides(product: StoreProduct): StoreProduct {
  const kind = productKind(product);
  const meta = displayMeta(product);
  const localImages = approvedImages(product);
  const fallbackImages = [product.imageUrl, ...(product.imageUrls || [])].filter(Boolean) as string[];
  const imageUrls = [...localImages, ...fallbackImages.filter((imageUrl) => !localImages.includes(imageUrl))];

  return {
    ...product,
    name: meta.name,
    description: meta.description,
    priceCents: kind ? approvedPrices[kind] : product.priceCents,
    imageUrl: imageUrls[0] || product.imageUrl,
    imageUrls: imageUrls.slice(1),
  };
}

function curatedStoreProducts(products: StoreProduct[]) {
  const seen = new Set<string>();

  return products
    .map((product) => ({ product, meta: displayMeta(product) }))
    .filter(({ meta }) => {
      if (meta.hidden || seen.has(meta.key)) return false;
      seen.add(meta.key);
      return true;
    })
    .sort((a, b) => a.meta.order - b.meta.order)
    .map(({ product }) => applyStoreOverrides(product));
}

function ProductVisual({ product }: { product: StoreProduct }) {
  const productImages = useMemo(
    () => [product.imageUrl, ...(product.imageUrls || [])].filter(Boolean) as string[],
    [product.imageUrl, product.imageUrls],
  );
  const [activeImages, setActiveImages] = useState(productImages);

  useEffect(() => {
    setActiveImages(productImages);
  }, [productImages]);

  if (!activeImages.length) return null;

  return (
    <div className={`store-product-visual is-${product.visual}`} aria-hidden="true">
      <img
        src={activeImages[0]}
        alt=""
        loading="lazy"
        onError={() => setActiveImages((current) => current.slice(1))}
      />
      {activeImages.length > 1 ? (
        <div className="store-product-thumbs">
          {activeImages.slice(0, 4).map((imageUrl) => (
            <span key={imageUrl} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Storefront({ products }: { products: StoreProduct[] }) {
  const [storeProducts, setStoreProducts] = useState(products);
  const [productSource, setProductSource] = useState<"static" | "printify">("static");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(
    Object.fromEntries(products.map((product) => [product.id, product.variants[0] || ""])),
  );
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerEmail, setCustomerEmail] = useState("");
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "loading">("idle");
  const [storeMessage, setStoreMessage] = useState<{ tone: "success" | "cancelled" | "error"; text: string } | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [sellerStatus, setSellerStatus] = useState<"idle" | "saving" | "sent">("idle");
  const [sellerError, setSellerError] = useState("");
  const cartTotalCents = cartItems.reduce(
    (total, item) => total + item.unitAmountCents * item.quantity,
    0,
  );

  useEffect(() => {
    let isMounted = true;
    getStoreProducts()
      .then((loadedProducts) => {
        if (!isMounted || !loadedProducts.length) return;
        const nextProducts = curatedStoreProducts(loadedProducts);
        setStoreProducts(nextProducts);
        setSelectedVariants(
          Object.fromEntries(nextProducts.map((product) => [product.id, product.variants[0] || ""])),
        );
        setProductSource("printify");
      })
      .catch(() => {
        if (!isMounted) return;
        setProductSource("static");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutResult = params.get("checkout");
    if (checkoutResult === "success" || checkoutResult === "stub") {
      setStoreMessage({
        tone: "success",
        text: checkoutResult === "stub" ? "Checkout stub complete." : "Order received. Thank you.",
      });
      setCartItems([]);
    }
    if (checkoutResult === "cancelled") {
      setStoreMessage({ tone: "cancelled", text: "Checkout was cancelled. Your cart is still here." });
    }
  }, []);

  function getVariantSku(product: StoreProduct, variant: string) {
    return product.variantSkus?.[variant] || product.dropshipSku;
  }

  function descriptionText(product: StoreProduct) {
    const description = product.description.trim();
    if (expandedDescriptions[product.id] || description.length <= DESCRIPTION_PREVIEW_LENGTH) {
      return description;
    }
    return `${description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trim()}...`;
  }

  function addToCart(product: StoreProduct) {
    const variant = selectedVariants[product.id] || product.variants[0] || "";
    const dropshipSku = getVariantSku(product, variant);
    if (!dropshipSku) {
      setStoreMessage({ tone: "error", text: "This item needs a fulfillment SKU before checkout." });
      return;
    }

    setStoreMessage(null);
    setCartItems((current) => {
      const existingItem = current.find(
        (item) => item.productId === product.id && item.variant === variant,
      );
      if (existingItem) {
        return current.map((item) =>
          item.productId === product.id && item.variant === variant
            ? { ...item, quantity: Math.min(item.quantity + 1, 10) }
            : item,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          variant,
          dropshipSku,
          unitAmountCents: product.priceCents,
          quantity: 1,
        },
      ];
    });
  }

  function updateCartQuantity(productId: string, variant: string, nextQuantity: number) {
    setCartItems((current) =>
      current
        .map((item) =>
          item.productId === productId && item.variant === variant
            ? { ...item, quantity: Math.max(0, Math.min(nextQuantity, 10)) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  async function startCheckout() {
    if (!cartItems.length) {
      setStoreMessage({ tone: "error", text: "Add at least one item before checkout." });
      return;
    }

    setCheckoutStatus("loading");
    setStoreMessage(null);

    try {
      const checkoutUrl = await createStoreCheckout({
        customer_email: customerEmail,
        items: cartItems.map((item) => ({
          product_id: item.productId,
          name: item.name,
          variant: item.variant,
          dropship_sku: item.dropshipSku,
          unit_amount_cents: item.unitAmountCents,
          quantity: item.quantity,
        })),
      });
      window.location.href = checkoutUrl;
    } catch {
      setStoreMessage({ tone: "error", text: "Unable to open checkout. Please try again." });
      setCheckoutStatus("idle");
    }
  }

  async function submitSellerRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSellerError("");
    setSellerStatus("saving");

    const form = new FormData(event.currentTarget);
    const phone = String(form.get("phone") || "");

    if (!isValidPhoneNumber(phone)) {
      setSellerError("Enter a 10-digit phone number so we can contact the business.");
      setSellerStatus("idle");
      return;
    }

    try {
      await createMarketingLead({
        lead_type: "business_availability",
        email: String(form.get("email") || ""),
        business_name: String(form.get("business_name") || ""),
        category: "Store vendor",
        area: String(form.get("area") || ""),
        phone: formatPhoneNumber(phone),
        website: normalizeWebsiteUrl(String(form.get("website") || "")),
        source: "store_vendor_request",
        notes: [
          `Items: ${String(form.get("items") || "")}`,
          `Fulfillment: ${String(form.get("fulfillment") || "")}`,
        ].join("\n"),
      });
      event.currentTarget.reset();
      setSellerStatus("sent");
    } catch {
      setSellerError("Could not send this yet. Please try again.");
      setSellerStatus("idle");
    }
  }

  return (
    <section className="store-shell" aria-label="Appalachia Offroad store">
      <div className="store-toolbar">
        <div>
          <p className="eyebrow">Rider store</p>
          <h1>Appalachia Offroad store is open.</h1>
          <p>
            Shirts, tank tops, phone cases, tumblers, hats, garden flags, and local
            business gear are available through secure Stripe checkout and
            print-on-demand fulfillment.
          </p>
        </div>
        <div className="store-toolbar-stat">
          <span>Status</span>
          <strong>{productSource === "printify" ? "Synced" : "Open"}</strong>
        </div>
      </div>

      <div className="store-layout">
        <div className="store-grid">
          {storeProducts.map((product) => (
            <article className="store-product-card" key={product.id}>
              <ProductVisual product={product} />
              <div className="store-product-body">
                <div className="store-product-heading">
                  <div>
                    <span>{product.badge}</span>
                    <h2>{product.name}</h2>
                  </div>
                  <strong>{formatMoney(product.priceCents)}</strong>
                </div>
                <div className="store-product-description">
                  <p>{descriptionText(product)}</p>
                  {product.description.length > DESCRIPTION_PREVIEW_LENGTH ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedDescriptions({
                          ...expandedDescriptions,
                          [product.id]: !expandedDescriptions[product.id],
                        })
                      }
                    >
                      {expandedDescriptions[product.id] ? "Show less" : "Show more"}
                    </button>
                  ) : null}
                </div>
                <label>
                  <span>Variant</span>
                  <select
                    value={selectedVariants[product.id] || product.variants[0] || ""}
                    onChange={(event) =>
                      setSelectedVariants({
                        ...selectedVariants,
                        [product.id]: event.target.value,
                      })
                    }
                  >
                    {product.variants.map((variant) => (
                      <option key={variant} value={variant}>
                        {variant}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="store-product-actions">
                  <small>{product.fulfillment}</small>
                  <button type="button" onClick={() => addToCart(product)}>
                    Add to cart
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="store-cart" aria-label="Store cart">
          <div className="store-cart-heading">
            <div>
              <span>Cart</span>
              <h2>Your order</h2>
            </div>
            <strong>{formatMoney(cartTotalCents)}</strong>
          </div>
          {storeMessage ? <p className={`store-message is-${storeMessage.tone}`}>{storeMessage.text}</p> : null}
          {cartItems.length ? (
            <div className="store-cart-list">
              {cartItems.map((item) => (
                <div className="store-cart-item" key={`${item.productId}-${item.variant}`}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.variant}</span>
                  </div>
                  <div className="store-cart-controls">
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.productId, item.variant, item.quantity - 1)}
                      aria-label={`Remove one ${item.name}`}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.productId, item.variant, item.quantity + 1)}
                      aria-label={`Add one ${item.name}`}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.productId, item.variant, 0)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="store-empty">Add rider gear to start an order.</p>
          )}
          <label className="store-email">
            <span>Email for receipt</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
            />
          </label>
          <div className="store-cart-total">
            <span>Subtotal</span>
            <strong>{formatMoney(cartTotalCents)}</strong>
          </div>
          <p className="store-note">Shipping is calculated in Stripe checkout. Print-on-demand items ship after production.</p>
          <button
            className="store-checkout-button"
            type="button"
            disabled={!cartItems.length || checkoutStatus === "loading"}
            onClick={startCheckout}
          >
            {checkoutStatus === "loading" ? "Opening checkout..." : "Checkout"}
          </button>
        </aside>
      </div>

      <section className="store-seller-panel" aria-labelledby="store-seller-heading">
        <div>
          <p className="eyebrow">Business sellers</p>
          <h2 id="store-seller-heading">Sell your shirts and trail-town gear here.</h2>
          <p>
            Local businesses can request a store slot for branded shirts, hats, tumblers,
            flags, event merch, recovery gear, or rider-ready items. We will review the
            request and follow up with publishing and fulfillment options.
          </p>
        </div>
        <form className="store-seller-form" onSubmit={submitSellerRequest}>
          <label>
            <span>Business name</span>
            <input required name="business_name" placeholder="Your business" />
          </label>
          <label>
            <span>Town or trail area</span>
            <input required name="area" placeholder="Rush, Harlan, Royal Blue..." />
          </label>
          <label>
            <span>Items to sell</span>
            <textarea
              required
              name="items"
              placeholder="Shirts, hats, tumblers, flags, patches, event merch..."
              rows={3}
            />
          </label>
          <label>
            <span>Fulfillment</span>
            <select name="fulfillment" defaultValue="Need print-on-demand help">
              <option>Need print-on-demand help</option>
              <option>Already have inventory</option>
              <option>Already use Printify or another vendor</option>
            </select>
          </label>
          <label>
            <span>Phone</span>
            <input
              inputMode="tel"
              name="phone"
              pattern="1?[ .-]?[(]?[0-9]{3}[)]?[ .-]?[0-9]{3}[ .-]?[0-9]{4}"
              placeholder="(606) 555-0142"
              required
              title="Enter a 10-digit phone number."
            />
          </label>
          <label>
            <span>Email</span>
            <input required name="email" type="email" placeholder="you@business.com" />
          </label>
          <label>
            <span>Website or Facebook</span>
            <input inputMode="url" name="website" placeholder="yourbusiness.com or Facebook link" />
          </label>
          {sellerError ? <p className="store-message is-error">{sellerError}</p> : null}
          {sellerStatus === "sent" ? (
            <p className="store-message is-success">Got it. We will review your items and follow up.</p>
          ) : null}
          <button className="store-checkout-button" type="submit" disabled={sellerStatus === "saving"}>
            {sellerStatus === "saving" ? "Sending..." : "Request seller access"}
          </button>
        </form>
      </section>
    </section>
  );
}
