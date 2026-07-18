import type { Metadata } from "next";
import { ExplorePlanBuilder } from "../../../components/ExplorePlanBuilder";
export const metadata:Metadata={title:"Build an Appalachia Trip | Explore Appalachia",description:"Build a multi-day Appalachian itinerary using approved local destinations near off-road trails."};
export default function Page(){return <main className="page"><section className="page-hero compact"><p className="eyebrow">Explore itinerary</p><h1>Build Your Appalachia Plan</h1><p>Create a family or adult trip using approved lodging, food, attractions, activities, shops, and essential stops.</p></section><ExplorePlanBuilder/></main>}
