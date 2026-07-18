"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getExploreDestinations } from "../lib/api";
import type { ExploreDestination } from "../lib/types";

type Stop={id:number;name:string;slug:string;category:string;address:string;day:number};
const storageKey="aoa_explore_trip_stops";
export function ExplorePlanBuilder(){
 const [places,setPlaces]=useState<ExploreDestination[]>([]),[stops,setStops]=useState<Stop[]>([]),[days,setDays]=useState(2),[family,setFamily]=useState(true),[lodging,setLodging]=useState(true),[food,setFood]=useState(true),[indoor,setIndoor]=useState(false),[outdoor,setOutdoor]=useState(true),[status,setStatus]=useState("");
 useEffect(()=>{getExploreDestinations().then(setPlaces).catch(()=>setStatus("Destinations are unavailable right now."));try{setStops(JSON.parse(localStorage.getItem(storageKey)||"[]"));}catch{}},[]);
 useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(stops));}catch{}},[stops]);
 const eligible=useMemo(()=>places.filter(p=>(!family||p.family_friendly)&&(!indoor||p.indoor)&&(!outdoor||p.outdoor)),[places,family,indoor,outdoor]);
 function generate(){const selected:ExploreDestination[]=[];const add=(types:string[])=>{const p=eligible.find(x=>types.includes(x.category)&&!selected.some(s=>s.id===x.id));if(p)selected.push(p)};if(lodging)add(["lodging","campgrounds"]);if(food){add(["local_food","ice_cream_desserts"]);add(["local_food"])}add(outdoor?["waterfalls","scenic_overlooks","hiking","parks","elk_viewing","fishing","swimming"]:["museums","historic_sites","local_shops","country_stores","family_activities"]);const next=selected.slice(0,Math.max(3,days*3)).map((p,i)=>({id:p.id,name:p.name,slug:p.slug,category:p.category,address:[p.address,p.city,p.state].filter(Boolean).join(", "),day:Math.min(days,Math.floor(i/3)+1)}));setStops(next);setStatus(next.length?"Suggested plan created and saved on this device.":"Approve destinations before generating a plan.")}
 function move(i:number,d:number){const j=i+d;if(j<0||j>=stops.length)return;const next=[...stops];[next[i],next[j]]=[next[j],next[i]];setStops(next)}
 const choices:[[boolean,(v:boolean)=>void,string]]|any=[[family,setFamily,"Family trip"],[lodging,setLodging,"Lodging"],[food,setFood,"Local food"],[outdoor,setOutdoor,"Outdoor"],[indoor,setIndoor,"Indoor"]];
 return <section className="explore-plan-builder"><div className="explore-plan-controls"><label>Days<input type="number" min={1} max={7} value={days} onChange={e=>setDays(Number(e.target.value))}/></label>{choices.map(([value,setter,label]:[boolean,(v:boolean)=>void,string])=><label key={label}><input type="checkbox" checked={value} onChange={e=>setter(e.target.checked)}/> {label}</label>)}<button onClick={generate}>Build Suggested Plan</button></div><p aria-live="polite">{status}</p><div className="explore-itinerary">{Array.from({length:days},(_,day)=><article key={day}><h2>Day {day+1}</h2>{stops.map((s,i)=>s.day===day+1?<div className="explore-trip-stop" key={`${s.id}-${i}`}><div><strong>{s.name}</strong><span>{s.category.replaceAll("_"," ")} · {s.address}</span></div><div><button onClick={()=>move(i,-1)}>↑</button><button onClick={()=>move(i,1)}>↓</button><button onClick={()=>setStops(stops.filter((_,x)=>x!==i))}>Remove</button><Link href={`/explore/${s.slug}`}>Details</Link></div></div>:null)}</article>)}</div></section>
}
