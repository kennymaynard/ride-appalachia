import type { RideMapFeature } from "./types";

// Population descriptions mirror the cited fisheries agency language. They are
// not estimates of the total number of fish in the river.
export const appalachianRiverFishPopulations: RideMapFeature[] = [
  {
    id: "levisa-fork-fish",
    areaSlug: "hatfield-ky",
    areaName: "Hatfield",
    title: "Levisa Fork fish",
    layer: "fish",
    latitude: 37.4881,
    longitude: -82.5443,
    summary: "Excellent bass and sunfish populations",
    detail:
      "Kentucky Fish and Wildlife reports excellent populations of smallmouth bass and rock bass, plus sunfish, channel catfish, spotted bass, occasional largemouth bass, white bass, and protected-slot walleye.",
    status: "Agency population description; 2017 sampling overview",
    updatedAt: "Source checked July 12, 2026",
    url: "https://fw.ky.gov/Fish/Pages/Levisa_Fork.aspx",
  },
  {
    id: "clinch-river-va-fish",
    areaSlug: "spearhead-mountain-view-va",
    areaName: "Spearhead Mountain View",
    title: "Clinch River fish",
    layer: "fish",
    latitude: 36.682,
    longitude: -82.57,
    summary: "Virginia's most fish-diverse river",
    detail:
      "Virginia DWR documents smallmouth bass, spotted bass, rock bass, walleye, longnose gar, channel and flathead catfish, sunfish, sauger, muskellunge, and freshwater drum. The river supports one of Virginia's two sauger populations.",
    status: "Documented sport-fish populations; representative river point",
    updatedAt: "Source checked July 12, 2026",
    url: "https://dwr.virginia.gov/wp-content/uploads/media/Clinch-River-2020-Popular-Report.pdf",
  },
  {
    id: "lower-new-river-va-fish",
    areaSlug: "pocahontas-wv",
    areaName: "Pocahontas",
    title: "Lower New River fish",
    layer: "fish",
    latitude: 37.323,
    longitude: -80.735,
    summary: "Smallmouth bass are the most abundant bass",
    detail:
      "Virginia DWR identifies smallmouth bass as the river's most abundant bass species. The lower river also supports native channel and flathead catfish, naturally reproducing walleye, and muskellunge.",
    status: "Agency abundance description; representative river point",
    updatedAt: "Source checked July 12, 2026",
    url: "https://dwr.virginia.gov/wp-content/uploads/media/An-Anglers-Guide-to-the-Lower-New-River-2021.pdf",
  },
];
