"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { recordPageVisit } from "../lib/api";
import { BrandLogo } from "./BrandLogo";
import { LaunchAccessPopup } from "./LaunchAccessPopup";

const businessPrefixes = [
  "/business",
  "/partner",
  "/rush-business-partners",
  "/admin",
];

function isBusinessPath(pathname: string) {
  return businessPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const businessSide = isBusinessPath(pathname);

  useEffect(() => {
    recordPageVisit({
      path: pathname,
      referrer: document.referrer,
    });
  }, [pathname]);

  return (
    <>
      {!businessSide ? <LaunchAccessPopup /> : null}
      <header className="topbar">
        <BrandLogo />
        {businessSide ? (
          <nav aria-label="Business navigation">
            <Link href="/business">Business Home</Link>
            <Link href="/partner">Pricing</Link>
            <Link href="/business/join">Create Listing</Link>
            <Link href="/business/login">Business Login</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        ) : (
          <nav aria-label="Rider navigation">
            <Link href="/ride-areas">Map</Link>
            <Link href="/planner">Plan Trip</Link>
            <Link href="/rider-tools">Saved Trips</Link>
            <Link href="/deals">Deals</Link>
            <Link href="/store">Store</Link>
            <Link href="/trail-talk">Trail Talk</Link>
            <Link href="/rider/login">Rider Login</Link>
          </nav>
        )}
        {businessSide ? (
          <>
            <Link className="join-link" href="/business/join">
              Create Listing
            </Link>
            <div className="audience-switch" aria-label="Switch app mode">
              <Link href="/" className="audience-switch-link">
                Rider
              </Link>
              <Link href="/business" className="audience-switch-link is-active">
                Business
              </Link>
            </div>
          </>
        ) : (
          <>
            <Link className="join-link" href="/ride-areas">
              Start Riding
            </Link>
            <div className="audience-switch" aria-label="Switch app mode">
              <Link href="/" className="audience-switch-link is-active">
                Rider
              </Link>
              <Link href="/business" className="audience-switch-link">
                Business
              </Link>
            </div>
          </>
        )}
      </header>
      {children}
      <footer className="site-footer">
        <div>
          <strong>Appalachia Offroad</strong>
          <span>{businessSide ? "Reach riders planning trips." : "Ride more. Plan less."}</span>
        </div>
        {businessSide ? (
          <nav aria-label="Business footer">
            <Link href="/business">Business Home</Link>
            <Link href="/partner">Pricing</Link>
            <Link href="/business/join">Create Listing</Link>
            <Link href="/business/login">Business Login</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/refunds">Refunds</Link>
          </nav>
        ) : (
          <nav aria-label="Rider footer">
            <Link href="https://www.facebook.com/share/1TduokbB5m/?mibextid=wwXIfr" target="_blank">
              Facebook
            </Link>
            <Link href="https://www.instagram.com/" target="_blank">
              Instagram
            </Link>
            <Link href="/contact">Contact</Link>
            <Link href="/ride-areas">Map</Link>
            <Link href="/planner">Plan Trip</Link>
            <Link href="/rider-tools">Saved Trips</Link>
            <Link href="/store">Store</Link>
            <Link href="/trail-talk">Trail Talk</Link>
            <Link href="/rider/login">Rider Login</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
        )}
      </footer>
    </>
  );
}
