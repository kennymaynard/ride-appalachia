import type { Metadata } from "next";
import Link from "next/link";
import { ExploreBrowser } from "../../components/ExploreBrowser";
import { getExploreDestinations } from "../../lib/api";

export const metadata: Metadata={title:"Explore Appalachia | Places Near Off-Road Trails",description:"Find local food, lodging, waterfalls, history, family activities, shops, fuel, and essential services near Appalachian trails."};
export default async function ExplorePage(){const destinations=await getExploreDestinations().catch(()=>[]);return <main className="page"><section className="page-hero compact"><p className="eyebrow">More than the trail</p><h1>Explore Appalachia</h1><p>Find the places, people, food, history, and hidden destinations that make every ride worth the trip.</p><div className="hero-actions"><Link href="/explore/suggest">Suggest a Place</Link><Link href="/explore/plan">Build a Trip</Link></div></section><ExploreBrowser destinations={destinations}/></main>}
