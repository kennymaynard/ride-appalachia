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
  visual: "shirt" | "hat" | "stickers" | "window" | "case" | "tumbler" | "flag";
  imageUrl?: string;
  imageUrls?: string[];
  source?: "static" | "printify";
};

export const storeProducts: StoreProduct[] = [
  {
    id: "trail-shirt",
    name: "Appalachia Offroad Trail Shirt",
    category: "Shirts",
    description: "Soft black trail tee with the Appalachia Offroad mountain and side-by-side artwork.",
    priceCents: 2600,
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
    imageUrls: [
      "/images/store/appalachia-offroad-shirt-lifestyle.png",
      "/images/store/appalachia-offroad-ride-hard-shirt-grid.png",
    ],
  },
  {
    id: "ride-hard-plan-less-shirt",
    name: "Ride Hard Plan Less Shirt",
    category: "Shirts",
    description: "Black rider tee with the Ride Hard Plan Less chest print for trail-day regulars.",
    priceCents: 2600,
    dropshipSku: "AO-SHIRT-RHPL",
    fulfillment: "Print-on-demand shirt",
    variants: [
      "Black / Small",
      "Black / Medium",
      "Black / Large",
      "Black / XL",
      "Black / 2XL",
      "Black / 3XL",
    ],
    badge: "Rider gear",
    visual: "shirt",
    imageUrls: [
      "/images/store/ride-hard-plan-less-shirt-lifestyle.png",
      "/images/store/appalachia-offroad-ride-hard-shirt-grid.png",
    ],
  },
  {
    id: "hero-verified-shirt",
    name: "Hero Verified Shirt",
    category: "Shirts",
    description: "Black tee with the Hero Verified badge artwork for veteran-owned and verified partners.",
    priceCents: 2600,
    dropshipSku: "AO-SHIRT-HERO",
    fulfillment: "Print-on-demand shirt",
    variants: [
      "Black / Small",
      "Black / Medium",
      "Black / Large",
      "Black / XL",
      "Black / 2XL",
      "Black / 3XL",
    ],
    badge: "Hero verified",
    visual: "shirt",
    imageUrls: ["/images/store/hero-verified-shirt-lifestyle.png"],
  },
  {
    id: "appalachia-offroad-tank-top",
    name: "Appalachia Offroad Tank Top",
    category: "Tank tops",
    description: "Warm-weather rider tank with Appalachia Offroad trail artwork.",
    priceCents: 2200,
    dropshipSku: "AO-TANK-TRAIL",
    fulfillment: "Print-on-demand tank top",
    variants: [
      "Black / Small",
      "Black / Medium",
      "Black / Large",
      "Black / XL",
      "Black / 2XL",
    ],
    badge: "Trail gear",
    visual: "shirt",
  },
  {
    id: "appalachia-offroad-phone-case",
    name: "Appalachia Offroad Phone Case",
    category: "Phone cases",
    description: "Protective phone case with Appalachia Offroad branding for trail days and daily use.",
    priceCents: 1800,
    dropshipSku: "AO-CASE-PHONE",
    fulfillment: "Print-on-demand phone case",
    variants: [
      "iPhone 15",
      "iPhone 15 Pro",
      "iPhone 14",
      "iPhone 14 Pro",
      "Samsung Galaxy S24",
      "Samsung Galaxy S23",
    ],
    badge: "Phone case",
    visual: "case",
  },
  {
    id: "appalachia-offroad-tumbler",
    name: "Appalachia Offroad Tumbler",
    category: "Tumblers",
    description: "Insulated trail tumbler for coffee, water, and post-ride refills.",
    priceCents: 2800,
    dropshipSku: "AO-TUMBLER-TRAIL",
    fulfillment: "Print-on-demand tumbler",
    variants: ["Black / 20 oz", "Stainless / 20 oz", "Black / 30 oz"],
    badge: "Drinkware",
    visual: "tumbler",
  },
  {
    id: "trail-hat",
    name: "Ridge Line Trail Hat",
    category: "Hats",
    description: "Structured trail hat with a stitched Appalachia Offroad patch look.",
    priceCents: 2800,
    dropshipSku: "AO-HAT-RIDGE",
    fulfillment: "Print-on-demand hat",
    variants: ["Black / Orange patch", "Charcoal / Black patch", "Camo / Orange patch"],
    badge: "Trail ready",
    visual: "hat",
  },
  {
    id: "appalachia-offroad-garden-flag",
    name: "Appalachia Offroad Garden Flag",
    category: "Garden flags",
    description: "Outdoor garden flag for campsites, cabins, shops, and trail-town storefronts.",
    priceCents: 1500,
    dropshipSku: "AO-FLAG-GARDEN",
    fulfillment: "Print-on-demand garden flag",
    variants: ["12 x 18 inch"],
    badge: "Flag",
    visual: "flag",
  },
];
