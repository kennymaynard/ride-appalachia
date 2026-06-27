import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "../components/BrandLogo";
import { LaunchAccessPopup } from "../components/LaunchAccessPopup";
import { ServiceWorkerRegister } from "../components/ServiceWorkerRegister";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Appalachia Offroad App | Trails, Lodging, Food, Deals & Events",
  description:
    "Discover offroad trails, lodging, food, recovery services, events, and exclusive rider deals across Appalachia. Built for ATV, UTV, Jeep, and SxS riders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegister />
        <LaunchAccessPopup />
        <header className="topbar">
          <BrandLogo />
          <nav>
            <Link href="/ride-areas">Find Nearby</Link>
            <Link href="/planner">Planner</Link>
            <Link href="/rider-tools">Tools</Link>
            <Link href="/trail-talk">Trail Talk</Link>
            <Link href="/lodging">Lodging</Link>
            <Link href="/deals">Deals</Link>
            <Link href="/heroes">Heroes</Link>
            <Link href="/business">Business</Link>
            <Link href="/partner">Partner</Link>
          </nav>
          <Link className="join-link" href="/business/join">
            Join
          </Link>
          <Link className="join-link secondary-link" href="/business/login">
            Login
          </Link>
        </header>
        {children}
        <footer className="site-footer">
          <div>
            <strong>Appalachia Offroad</strong>
            <span>Ride more. Plan less.</span>
          </div>
          <nav>
            <Link href="https://www.facebook.com/share/1TduokbB5m/?mibextid=wwXIfr" target="_blank">Facebook</Link>
            <Link href="https://www.instagram.com/" target="_blank">Instagram</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/trail-talk">Trail Talk</Link>
            <Link href="/rider-tools">Rider Tools</Link>
            <Link href="/business">FAQ</Link>
            <Link href="/business/join">Business Signup</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/refunds">Refunds</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
