"use client";

import { useEffect, useState } from "react";
import { getStoreProducts } from "../lib/api";
import type { StoreProduct } from "../lib/store-products";

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

function ProductVisual({ product }: { product: StoreProduct }) {
  return (
    <div className={`store-product-visual is-${product.visual}`} aria-hidden="true">
      {product.imageUrl ? (
        <img src={product.imageUrl} alt="" loading="lazy" />
      ) : null}
      {!product.imageUrl && product.visual === "shirt" ? (
        <div className="shirt-mock">
          <span>AO</span>
          <strong>APPALACHIA OFFROAD</strong>
        </div>
      ) : null}
      {!product.imageUrl && product.visual === "hat" ? (
        <div className="hat-mock">
          <span />
          <strong>AO</strong>
        </div>
      ) : null}
      {!product.imageUrl && product.visual === "stickers" ? (
        <div className="sticker-stack">
          <span>TRAIL</span>
          <span>RUSH</span>
          <span>WV</span>
        </div>
      ) : null}
      {!product.imageUrl && product.visual === "window" ? (
        <div className="window-decal-mock">
          <span>APPALACHIA</span>
          <strong>OFFROAD</strong>
        </div>
      ) : null}
    </div>
  );
}

export function Storefront({ products }: { products: StoreProduct[] }) {
  const [storeProducts, setStoreProducts] = useState(products);
  const [productSource, setProductSource] = useState<"static" | "printify">("static");

  useEffect(() => {
    let isMounted = true;
    getStoreProducts()
      .then((loadedProducts) => {
        if (!isMounted || !loadedProducts.length) return;
        setStoreProducts(loadedProducts);
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

  return (
    <section className="store-shell" aria-label="Appalachia Offroad store">
      <div className="store-toolbar">
        <div>
          <p className="eyebrow">Rider store</p>
          <h1>Appalachia Offroad store coming soon.</h1>
          <p>
            Shirts, hats, trail stickers, and vehicle window decals are being prepared
            for print-on-demand fulfillment. Checkout will open once every item is published.
          </p>
        </div>
        <div className="store-toolbar-stat is-coming-soon">
          <span>Status</span>
          <strong>{productSource === "printify" ? "Synced" : "Soon"}</strong>
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
                <p>{product.description}</p>
                <label>
                  <span>Planned variants</span>
                  <select value={product.variants[0] || ""} disabled>
                    {product.variants.map((variant) => (
                      <option key={variant} value={variant}>
                        {variant}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="store-product-actions">
                  <small>{product.fulfillment}</small>
                  <button type="button" disabled>
                    Coming soon
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="store-cart" aria-label="Store cart">
          <div className="store-cart-heading">
            <div>
              <span>Store launch</span>
              <h2>Coming soon</h2>
            </div>
            <strong>Printify</strong>
          </div>
          <p className="store-empty">
            We are finishing the product publishing step before opening checkout.
            The first drop will include rider shirts, hats, trail stickers, and vehicle decals.
            {productSource === "printify" ? " Product previews are synced from Printify." : ""}
          </p>
          <div className="store-cart-total">
            <span>Launch items</span>
            <strong>{storeProducts.length}</strong>
          </div>
          <p className="store-note">Orders will use secure Stripe checkout and Printify fulfillment when the store opens.</p>
          <button
            className="store-checkout-button"
            type="button"
            disabled
          >
            Checkout opening soon
          </button>
        </aside>
      </div>
    </section>
  );
}
