import { Storefront } from "../../components/Storefront";
import { storeProducts } from "../../lib/store-products";

export const metadata = {
  title: "Store | Appalachia Offroad",
  description: "Shop Appalachia Offroad shirts, hats, trail stickers, and vehicle window decals.",
};

export default function StorePage() {
  return (
    <main className="page store-page">
      <Storefront products={storeProducts} />
    </main>
  );
}
