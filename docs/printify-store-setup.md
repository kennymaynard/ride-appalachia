# Printify Store Setup

Use Printify for the Appalachia Offroad print-on-demand store. Orders are paid in Stripe, then the Stripe webhook submits the paid merch order to Printify by SKU.

## Rotate The Token

If a Printify token was pasted into chat, revoke it in Printify and create a fresh token before using it in Render.

## Render Backend Env Vars

Set these on the backend service:

```text
PRINTIFY_API_TOKEN=<fresh Printify token>
PRINTIFY_SHOP_ID=<Printify API store shop id>
PRINTIFY_AUTO_SUBMIT_ORDERS=true
PRINTIFY_SEND_SHIPPING_NOTIFICATION=false
```

Keep `PRINTIFY_AUTO_SUBMIT_ORDERS=false` until the Printify products and variant SKUs below are ready.

## Printify Product Setup

Create finished products in Printify first, then set each product variant SKU to match the app-generated SKU. The backend submits orders using the SKU-only order flow, so the SKU must match exactly.

### Shirts

Base SKU: `AO-SHIRT-TRAIL`

```text
AO-SHIRT-TRAIL-BLACK-SMALL
AO-SHIRT-TRAIL-BLACK-MEDIUM
AO-SHIRT-TRAIL-BLACK-LARGE
AO-SHIRT-TRAIL-BLACK-XL
AO-SHIRT-TRAIL-BLACK-2XL
AO-SHIRT-TRAIL-BLACK-3XL
AO-SHIRT-TRAIL-TRAIL-ORANGE-SMALL
AO-SHIRT-TRAIL-TRAIL-ORANGE-MEDIUM
AO-SHIRT-TRAIL-TRAIL-ORANGE-LARGE
AO-SHIRT-TRAIL-TRAIL-ORANGE-XL
AO-SHIRT-TRAIL-TRAIL-ORANGE-2XL
AO-SHIRT-TRAIL-TRAIL-ORANGE-3XL
```

### Hats

Base SKU: `AO-HAT-RIDGE`

```text
AO-HAT-RIDGE-BLACK-ORANGE-PATCH
AO-HAT-RIDGE-CHARCOAL-BLACK-PATCH
AO-HAT-RIDGE-CAMO-ORANGE-PATCH
```

### Trail Sticker Packs

Base SKU: `AO-STICKER-TRAILPACK`

```text
AO-STICKER-TRAILPACK-CLASSIC-ORANGE-PACK
AO-STICKER-TRAILPACK-TRAIL-SYSTEMS-PACK
AO-STICKER-TRAILPACK-FAMILY-RIDE-PACK
```

### Vehicle Window Decals

Base SKU: `AO-DECAL-WINDOW`

```text
AO-DECAL-WINDOW-WHITE-5-INCH
AO-DECAL-WINDOW-WHITE-8-INCH
AO-DECAL-WINDOW-ORANGE-5-INCH
AO-DECAL-WINDOW-ORANGE-8-INCH
```

## Design Direction

Start with three designs:

1. Main logo shirt: small chest mark, large back print.
2. Trail map shirt: route-line graphic with `Appalachia Offroad Trail Crew`.
3. Badge shirt: `Kentucky / West Virginia / Tennessee` with `Trails - Lodging - Food - Fuel`.

For hats, use a simple embroidered `AO` mountain badge. For stickers and window decals, use high-contrast orange, white, and black artwork with minimal small text.
