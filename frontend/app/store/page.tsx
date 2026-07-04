import { Storefront } from "../../components/Storefront";
import { storeProducts } from "../../lib/store-products";

export const metadata = {
  title: "Store | Appalachia Offroad",
  description: "Shop Appalachia Offroad shirts, tank tops, phone cases, tumblers, hats, and garden flags.",
};

export default function StorePage() {
  return (
    <main className="page store-page">
      <Storefront products={storeProducts} />
    </main>
  );
}
