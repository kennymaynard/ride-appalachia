import { SharedRideSafety } from "../../../components/SharedRideSafety";

export default async function SharedSafetyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <main className="section-shell"><SharedRideSafety shareToken={token} /></main>;
}
