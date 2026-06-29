import type { Metadata } from "next";
import { ServiceWorkerRegister } from "../components/ServiceWorkerRegister";
import { SiteChrome } from "../components/SiteChrome";
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
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
