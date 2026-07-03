"use client";

import { useEffect, useMemo, useState } from "react";
import { createStoreCheckout } from "../lib/api";
import type { StoreProduct } from "../lib/store-products";

type CartItem = {
  productId: StoreProduct["id"];
  variant: string;
  quantity: number;
};

type CheckoutState = "idle" | "loading" | "success" | "cancelled" | "error";

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

function cartKey(productId: string, variant: string) {
  return `${productId}::${variant}`;
}

function ProductVisual({ product }: { product: StoreProduct }) {
  return (
    <div className={`store-product-visual is-${product.visual}`} aria-hidden="true">
      {product.visual === "shirt" ? (
        <div className="shirt-mock">
          <span>AO</span>
          <strong>APPALACHIA OFFROAD</strong>
        </div>
      ) : null}
      {product.visual === "hat" ? (
        <div className="hat-mock">
          <span />
          <strong>AO</strong>
        </div>
      ) : null}
      {product.visual === "stickers" ? (
        <div className="sticker-stack">
          <span>TRAIL</span>
          <span>RUSH</span>
          <span>WV</span>
        </div>
      ) : null}
      {product.visual === "window" ? (
        <div className="window-decal-mock">
          <span>APPALACHIA</span>
          <strong>OFFROAD</strong>
        </div>
      ) : null}
    </div>
  );
}

export function Storefront({ products }: { products: StoreProduct[] }) {
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(
    Object.fromEntries(products.map((product) => [product.id, product.variants[0] || ""])),
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerEmail, setCustomerEmail] = useState("");
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
  const [checkoutMessage, setCheckoutMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success" || checkout === "stub") {
      setCheckoutState("success");
      setCheckoutMessage("Order started. Check your inbox for the Stripe receipt and shipping details.");
    }
    if (checkout === "cancelled") {
      setCheckoutState("cancelled");
      setCheckoutMessage("Checkout was cancelled. Your cart is still here.");
    }
  }, []);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const cartLines = cart
    .map((item) => {
      const product = productById.get(item.productId);
      return product ? { ...item, product } : null;
    })
    .filter(Boolean) as Array<CartItem & { product: StoreProduct }>;

  const subtotalCents = cartLines.reduce(
    (total, item) => total + item.product.priceCents * item.quantity,
    0,
  );

  function addToCart(product: StoreProduct) {
    const variant = selectedVariants[product.id] || product.variants[0] || "";
    const key = cartKey(product.id, variant);
    setCart((current) => {
      const existing = current.find((item) => cartKey(item.productId, item.variant) === key);
      if (existing) {
        return current.map((item) =>
          cartKey(item.productId, item.variant) === key
            ? { ...item, quantity: Math.min(item.quantity + 1, 10) }
            : item,
        );
      }
      return [...current, { productId: product.id, variant, quantity: 1 }];
    });
    setCheckoutState("idle");
    setCheckoutMessage("");
  }

  function updateQuantity(productId: StoreProduct["id"], variant: string, quantity: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.productId === productId && item.variant === variant
            ? { ...item, quantity: Math.max(1, Math.min(quantity, 10)) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function removeItem(productId: StoreProduct["id"], variant: string) {
    setCart((current) =>
      current.filter((item) => !(item.productId === productId && item.variant === variant)),
    );
  }

  async function startCheckout() {
    if (!cartLines.length) {
      setCheckoutState("error");
      setCheckoutMessage("Add at least one item before checkout.");
      return;
    }

    setCheckoutState("loading");
    setCheckoutMessage("");
    try {
      const checkoutUrl = await createStoreCheckout({
        customer_email: customerEmail,
        items: cartLines.map((item) => ({
          product_id: item.product.id,
          name: item.product.name,
          variant: item.variant,
          dropship_sku: `${item.product.dropshipSku}-${item.variant
            .replace(/\s+/g, "-")
            .replace(/[^A-Z0-9-]/gi, "")
            .toUpperCase()}`,
          unit_amount_cents: item.product.priceCents,
          quantity: item.quantity,
        })),
      });
      window.location.href = checkoutUrl;
    } catch (error) {
      setCheckoutState("error");
      setCheckoutMessage(error instanceof Error ? error.message : "Unable to start checkout.");
    }
  }

  return (
    <section className="store-shell" aria-label="Appalachia Offroad store">
      <div className="store-toolbar">
        <div>
          <p className="eyebrow">Rider store</p>
          <h1>Trail gear, stickers, and window decals.</h1>
          <p>
            Shirts, hats, trail stickers, and vehicle decals set up for print-on-demand
            dropshipping through Stripe checkout.
          </p>
        </div>
        <div className="store-toolbar-stat">
          <span>Cart</span>
          <strong>{cartLines.reduce((total, item) => total + item.quantity, 0)}</strong>
        </div>
      </div>

      <div className="store-layout">
        <div className="store-grid">
          {products.map((product) => (
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
                <p>{product.description}</p>
                <label>
                  <span>Variant</span>
                  <select
                    value={selectedVariants[product.id] || product.variants[0]}
                    onChange={(event) =>
                      setSelectedVariants((current) => ({
                        ...current,
                        [product.id]: event.target.value,
                      }))
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
              <span>Secure checkout</span>
              <h2>Your gear</h2>
            </div>
            <strong>{formatMoney(subtotalCents)}</strong>
          </div>

          {cartLines.length ? (
            <div className="store-cart-list">
              {cartLines.map((item) => (
                <article className="store-cart-item" key={cartKey(item.productId, item.variant)}>
                  <div>
                    <strong>{item.product.name}</strong>
                    <span>{item.variant}</span>
                  </div>
                  <div className="store-cart-controls">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.variant, item.quantity - 1)}
                      aria-label={`Decrease ${item.product.name}`}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.variant, item.quantity + 1)}
                      aria-label={`Increase ${item.product.name}`}
                    >
                      +
                    </button>
                    <button type="button" onClick={() => removeItem(item.productId, item.variant)}>
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="store-empty">Pick a shirt, hat, sticker pack, or window decal to start.</p>
          )}

          <label className="store-email">
            <span>Email for receipt</span>
            <input
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              placeholder="rider@example.com"
            />
          </label>

          <div className="store-cart-total">
            <span>Subtotal</span>
            <strong>{formatMoney(subtotalCents)}</strong>
          </div>
          <p className="store-note">Shipping and taxes are calculated in Stripe checkout.</p>
          <button
            className="store-checkout-button"
            type="button"
            onClick={startCheckout}
            disabled={checkoutState === "loading" || !cartLines.length}
          >
            {checkoutState === "loading" ? "Starting checkout..." : "Checkout with Stripe"}
          </button>
          {checkoutMessage ? (
            <p className={`store-message is-${checkoutState}`}>{checkoutMessage}</p>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
