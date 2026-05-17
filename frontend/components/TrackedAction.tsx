"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { trackActionClick, trackDealClaimClick } from "../lib/api";

type Props = {
  businessId: number;
  children: ReactNode;
  className?: string;
  dealId?: number;
  href: string;
  kind?: "anchor" | "link";
};

export function TrackedAction({
  businessId,
  children,
  className,
  dealId,
  href,
  kind = "anchor",
}: Props) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    void trackActionClick(businessId);
    if (dealId) void trackDealClaimClick(dealId);

    if (kind === "anchor" && !href.startsWith("tel:")) {
      event.currentTarget.rel = "noopener noreferrer";
    }
  }

  if (kind === "link") {
    return (
      <Link className={className} href={href} onClick={handleClick}>
        {children}
      </Link>
    );
  }

  return (
    <a className={className} href={href} onClick={handleClick}>
      {children}
    </a>
  );
}
