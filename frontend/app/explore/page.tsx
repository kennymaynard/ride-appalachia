import type { Metadata } from "next";
import Link from "next/link";
import { ExploreBrowser } from "../../components/ExploreBrowser";
import { getExploreDestinations } from "../../lib/api";

export const metadata: Metadata={title:"Explore Appalachia | Places Near Off-Road Trails",description:"Find local food, lodging, waterfalls, history, family activities, shops, fuel, and essential services near Appalachian trails."};
export default async function ExplorePage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams;const query=new URLSearchParams();for(const key of ["latitude","longitude","distance"]){const value=params[key];if(typeof value==="string")query.set(key,value)}query.set("limit","250");const destinations=await getExploreDestinations(query.toString()).catch(()=>[]);const near=typeof params.near==="string"?params.near:"";return <main className="page"><section className="page-hero compact"><p className="eyebrow">More than the trail</p><h1>Explore Appalachia</h1><p>{near?`Showing destinations near ${near}.`:"Find the places, people, food, history, and hidden destinations that make every ride worth the trip."}</p><div className="hero-actions"><Link href="/explore/suggest">Suggest a Place</Link><Link href="/explore/plan">Build a Trip</Link></div></section><ExploreBrowser destinations={destinations}/></main>}
