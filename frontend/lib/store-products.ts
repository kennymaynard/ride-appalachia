export type StoreProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  priceCents: number;
  dropshipSku: string;
  fulfillment: string;
  variants: string[];
  variantSkus?: Record<string, string>;
  badge: string;
  visual: "shirt" | "hat" | "stickers" | "window";
  imageUrl?: string;
  source?: "static" | "printify";
};

export const storeProducts: StoreProduct[] = [
  {
    id: "trail-shirt",
    name: "Appalachia Offroad Trail Shirt",
    category: "Shirts",
    description: "Soft black trail tee with an orange Appalachia Offroad chest mark and back print.",
    priceCents: 3200,
    dropshipSku: "AO-SHIRT-TRAIL",
    fulfillment: "Print-on-demand shirt",
    variants: [
      "Black / Small",
      "Black / Medium",
      "Black / Large",
      "Black / XL",
      "Black / 2XL",
      "Black / 3XL",
      "Trail Orange / Small",
      "Trail Orange / Medium",
      "Trail Orange / Large",
      "Trail Orange / XL",
      "Trail Orange / 2XL",
      "Trail Orange / 3XL",
    ],
    badge: "Rider gear",
    visual: "shirt",
  },
  {
    id: "trail-hat",
    name: "Ridge Line Trail Hat",
    category: "Hats",
    description: "Structured trail hat with a stitched Appalachia Offroad patch look.",
    priceCents: 2800,
    dropshipSku: "AO-HAT-RIDGE",
    fulfillment: "Dropship embroidered hat",
    variants: ["Black / Orange patch", "Charcoal / Black patch", "Camo / Orange patch"],
    badge: "Trail ready",
    visual: "hat",
  },
  {
    id: "trail-sticker-pack",
    name: "Trail Badge Sticker Pack",
    category: "Trail stickers",
    description: "Weather-resistant stickers for coolers, toolboxes, helmets, and garage walls.",
    priceCents: 1200,
    dropshipSku: "AO-STICKER-TRAILPACK",
    fulfillment: "Dropship sticker sheet",
    variants: ["Classic orange pack", "Trail systems pack", "Family ride pack"],
    badge: "Sticker pack",
    visual: "stickers",
  },
  {
    id: "vehicle-window-decal",
    name: "Vehicle Window Decal",
    category: "Window stickers",
    description: "Outdoor-rated Appalachia Offroad window decal for trucks, trailers, and side-by-sides.",
    priceCents: 1000,
    dropshipSku: "AO-DECAL-WINDOW",
    fulfillment: "Dropship vinyl decal",
    variants: ["White / 5 inch", "White / 8 inch", "Orange / 5 inch", "Orange / 8 inch"],
    badge: "Vehicle decal",
    visual: "window",
  },
];
