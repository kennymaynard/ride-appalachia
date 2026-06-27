"use client";

import Link from "next/link";
import { useState } from "react";

export function BrandLogo() {
  const [showImage, setShowImage] = useState(true);

  return (
    <Link className="brand" href="/">
      {showImage ? (
        <img
          alt="Appalachia Offroad"
          className="brand-logo"
          src="/appalachia-offroad-logo.png"
          onError={() => setShowImage(false)}
        />
      ) : null}
      <span className={showImage ? "brand-text sr-only" : "brand-text"}>
        Ride <strong>Appalachia</strong>
      </span>
    </Link>
  );
}
