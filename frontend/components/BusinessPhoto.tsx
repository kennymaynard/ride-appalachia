"use client";

import { useEffect, useMemo, useState } from "react";
import type { SyntheticEvent } from "react";
import type { Category } from "../lib/types";

type Props = {
  alt?: string;
  category: Category;
  src: string;
};

const fallbackPhotos: Record<Exclude<Category, "deals">, string> = {
  lodging:
    "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1200&q=80",
  food: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
  rentals:
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
  repairs:
    "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1200&q=80",
  fuel: "https://images.unsplash.com/photo-1541410965313-d53b3c16ef17?auto=format&fit=crop&w=1200&q=80",
};

function fallbackForCategory(category: Category) {
  return category === "deals" ? fallbackPhotos.food : fallbackPhotos[category];
}

export function BusinessPhoto({ alt = "", category, src }: Props) {
  const fallback = useMemo(() => fallbackForCategory(category), [category]);
  const [photoUrl, setPhotoUrl] = useState(src || fallback);

  useEffect(() => {
    setPhotoUrl(src || fallback);
  }, [fallback, src]);

  function useFallback(event: SyntheticEvent<HTMLImageElement>) {
    if (event.currentTarget.src !== fallback) {
      setPhotoUrl(fallback);
    }
  }

  return <img src={photoUrl} alt={alt} onError={useFallback} />;
}
