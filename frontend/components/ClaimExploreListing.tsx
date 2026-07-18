"use client";

import { useRouter } from "next/navigation";
import { createExploreClaimTarget } from "../lib/api";
import { requireRiderToken } from "../lib/rider-auth";

const claimable = new Set(["local_food","lodging","historic_sites","museums","local_shops","country_stores","ice_cream_desserts","family_activities","campgrounds","events","fuel","repairs_recovery","hospitals_urgent_care"]);

export function ClaimExploreListing({ slug, category, claimed }: { slug:string; category:string; claimed:boolean }) {
  const router=useRouter();
  if(!claimable.has(category))return null;
  if(claimed)return <span className="explore-claimed-badge">Claimed &amp; owner verified</span>;
  async function start(){const token=requireRiderToken(`/explore/${slug}`);if(!token)return;try{const result=await createExploreClaimTarget(slug,token);router.push(result.claim_url)}catch(error){window.alert(error instanceof Error?error.message:"Unable to start this claim")}}
  return <button type="button" onClick={start}>Claim This Listing</button>;
}
