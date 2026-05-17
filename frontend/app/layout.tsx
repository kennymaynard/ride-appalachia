import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "../components/BrandLogo";
import "./globals.css";

export const metadata: Metadata = {
  title: "Appalachia Offroad",
  description: "ATV and UTV marketplace and trip planner for Appalachia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <BrandLogo />
          <nav>
            <Link href="/ride-areas">Ride Areas</Link>
            <Link href="/planner">Planner</Link>
            <Link href="/lodging">Lodging</Link>
            <Link href="/deals">Deals</Link>
            <Link href="/business">Business</Link>
            <Link href="/partner">Partner</Link>
            <Link href="/admin">Admin</Link>
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
            <Link href="/contact">Contact</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/refunds">Refunds</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
