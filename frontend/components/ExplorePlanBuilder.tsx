"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getExploreDestinations } from "../lib/api";
import type { ExploreDestination } from "../lib/types";
import { exploreTripStorageKey, type ExploreTripStop } from "./AddExploreToTrip";

export type ExploreTrailOption = { slug: string; matchSlugs: string[]; plannerKey: string; name: string; area: string; latitude: number; longitude: number };
type DraftStop = ExploreTripStop & { day: number; distanceMiles?: number };
const draftKey = "aoa_explore_itinerary_draft";

const activityCategories = ["waterfalls", "scenic_overlooks", "hiking", "parks", "elk_viewing", "fishing", "swimming", "family_activities", "museums", "historic_sites", "local_shops", "country_stores"];

function radians(value:number){return value*Math.PI/180}
function miles(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}){const dLat=radians(b.latitude-a.latitude),dLon=radians(b.longitude-a.longitude),x=Math.sin(dLat/2)**2+Math.cos(radians(a.latitude))*Math.cos(radians(b.latitude))*Math.sin(dLon/2)**2;return 3958.8*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function asStop(place:ExploreDestination,day:number,distanceMiles?:number):DraftStop{return {id:place.id,name:place.name,slug:place.slug,category:place.category,address:place.address,city:place.city,state:place.state,latitude:place.latitude,longitude:place.longitude,hours_json:place.hours_json,arrivalNotes:"",day,distanceMiles}}

export function ExplorePlanBuilder({ trails }: { trails: ExploreTrailOption[] }) {
  const [places,setPlaces]=useState<ExploreDestination[]>([]),[stops,setStops]=useState<DraftStop[]>([]),[days,setDays]=useState(2),[startingCity,setStartingCity]=useState(""),[trailSlug,setTrailSlug]=useState(""),[maxMiles,setMaxMiles]=useState(25),[family,setFamily]=useState(true),[lodging,setLodging]=useState(true),[food,setFood]=useState(true),[indoor,setIndoor]=useState(false),[outdoor,setOutdoor]=useState(true),[status,setStatus]=useState("");
  useEffect(()=>{getExploreDestinations().then(setPlaces).catch(()=>setStatus("Destinations are unavailable right now."));try{const saved=JSON.parse(localStorage.getItem(draftKey)||"[]");if(Array.isArray(saved))setStops(saved)}catch{}},[]);
  useEffect(()=>{try{localStorage.setItem(draftKey,JSON.stringify(stops))}catch{}},[stops]);
  const selectedTrail=trails.find(trail=>trail.slug===trailSlug);
  const eligible=useMemo(()=>places.map(place=>{const distance=selectedTrail&&typeof place.latitude==="number"&&typeof place.longitude==="number"?miles(selectedTrail,{latitude:place.latitude,longitude:place.longitude}):undefined;return {...place,distance_miles:distance}}).filter(place=>{const settingMatches=indoor&&outdoor?(place.indoor||place.outdoor):indoor?place.indoor:outdoor?place.outdoor:true;return (!family||place.family_friendly)&&settingMatches&&(!selectedTrail||selectedTrail.matchSlugs.some(slug=>place.nearby_trail_slugs.includes(slug))||(place.distance_miles!=null&&place.distance_miles<=maxMiles))}).sort((a,b)=>Number(b.featured)-Number(a.featured)||(a.distance_miles??9999)-(b.distance_miles??9999)),[places,family,indoor,outdoor,selectedTrail,maxMiles]);

  function generate(){
    const selected:DraftStop[]=[];
    const add=(categories:string[],day:number)=>{const place=eligible.find(item=>categories.includes(item.category)&&!selected.some(stop=>stop.id===item.id));if(place)selected.push(asStop(place,Math.min(days,day),place.distance_miles??undefined))};
    if(lodging)add(["lodging","campgrounds"],1);
    if(food)add(["local_food","ice_cream_desserts"],1);
    add(outdoor?activityCategories.filter(category=>!["museums","historic_sites","local_shops","country_stores"].includes(category)):activityCategories.filter(category=>["museums","historic_sites","local_shops","country_stores","family_activities"].includes(category)),Math.min(days,2));
    if(food)add(["local_food","ice_cream_desserts"],Math.min(days,2));
    if(days>2)add(activityCategories,3);
    if(lodging&&days>2)add(["lodging","campgrounds"],Math.min(days,3));
    setStops(selected);setStatus(selected.length?"Suggested draft created. Review it, then add the finished plan to your trip.":"No approved destinations match those choices yet. Try a wider distance or fewer filters.");
  }
  function move(index:number,direction:number){const next=index+direction;if(next<0||next>=stops.length)return;setStops(current=>{const copy=[...current];[copy[index],copy[next]]=[copy[next],copy[index]];return copy})}
  function replace(index:number){const current=stops[index];const replacement=eligible.find(place=>place.category===current.category&&!stops.some(stop=>stop.id===place.id))||eligible.find(place=>!stops.some(stop=>stop.id===place.id));if(!replacement){setStatus("No unused matching destination is available.");return}setStops(items=>items.map((stop,i)=>i===index?asStop(replacement,current.day,replacement.distance_miles??undefined):stop));setStatus(`${current.name} was replaced with ${replacement.name}.`)}
  function saveToPlanner(){try{localStorage.setItem(exploreTripStorageKey,JSON.stringify(stops));if(selectedTrail){const key="ride-appalachia-trip-planner-selections",current=JSON.parse(localStorage.getItem(key)||"{}");const trails=Array.isArray(current.trails)?current.trails:[];localStorage.setItem(key,JSON.stringify({trails:trails.includes(selectedTrail.plannerKey)?trails:[...trails,selectedTrail.plannerKey],stops:Array.isArray(current.stops)?current.stops:[],outdoors:Array.isArray(current.outdoors)?current.outdoors:[]}))}setStatus("Finished itinerary added to the main trip planner.")}catch{setStatus("This browser blocked saving the itinerary.")}}
  const choices:[[boolean,(value:boolean)=>void,string],...Array<[boolean,(value:boolean)=>void,string]>]=[[family,setFamily,"Family trip"],[lodging,setLodging,"Lodging"],[food,setFood,"Local food"],[outdoor,setOutdoor,"Outdoor"],[indoor,setIndoor,"Indoor"]];

  return <section className="explore-plan-builder">
    <div className="explore-plan-controls">
      <label>Starting city<input placeholder="Inez, KY" value={startingCity} onChange={event=>setStartingCity(event.target.value)}/></label>
      <label>Trail<select value={trailSlug} onChange={event=>setTrailSlug(event.target.value)}><option value="">Any trail</option>{trails.map(trail=><option key={trail.slug} value={trail.slug}>{trail.name} · {trail.area}</option>)}</select></label>
      <label>Days<input type="number" min={1} max={7} value={days} onChange={event=>setDays(Number(event.target.value))}/></label>
      <label>Maximum distance<select value={maxMiles} onChange={event=>setMaxMiles(Number(event.target.value))}>{[5,10,25,50].map(value=><option value={value} key={value}>{value} miles</option>)}</select></label>
      {choices.map(([value,setter,label])=><label key={label}><input type="checkbox" checked={value} onChange={event=>setter(event.target.checked)}/> {label}</label>)}
      <button onClick={generate}>Build Suggested Plan</button>
    </div>
    {selectedTrail?<p className="explore-trail-day"><strong>Ride stop:</strong> {selectedTrail.name} at {selectedTrail.area} is the anchor for this itinerary.</p>:null}
    <p aria-live="polite">{status}</p>
    <div className="explore-itinerary">{Array.from({length:days},(_,day)=><article key={day}><h2>Day {day+1}</h2>{stops.filter(stop=>stop.day===day+1).map(stop=>{const index=stops.findIndex(item=>item.id===stop.id);return <div className="explore-trip-stop" key={stop.id}><div><strong>{stop.name}</strong><span>{stop.category.replaceAll("_"," ")} · {[stop.address,stop.city,stop.state].filter(Boolean).join(", ")}{stop.distanceMiles!=null?` · ${stop.distanceMiles.toFixed(1)} miles from trail`:""}</span></div><div><button disabled={index===0} onClick={()=>move(index,-1)}>↑</button><button disabled={index===stops.length-1} onClick={()=>move(index,1)}>↓</button><button onClick={()=>replace(index)}>Replace</button><button onClick={()=>setStops(items=>items.filter(item=>item.id!==stop.id))}>Remove</button><Link href={`/explore/${stop.slug}`}>Details</Link></div></div>})}</article>)}</div>
    {stops.length?<div className="explore-plan-finish"><button onClick={saveToPlanner}>Add Finished Plan to Trip Planner</button><Link href={`/planner${startingCity?`?area=${encodeURIComponent(startingCity)}`:""}#explore-trip-stops`}>Open Trip Planner</Link></div>:null}
  </section>;
}
