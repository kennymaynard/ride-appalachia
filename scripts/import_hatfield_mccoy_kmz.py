#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "frontend/lib/hatfield-mccoy-routes.ts"

SYSTEMS = [
    ("bearwallow-wv", "Bearwallow Trail System", ["bearwallow"]),
    ("big-coal-river-wv", "Big Coal River Trail System", ["big coal river", "big coal"]),
    ("braveheart-wv", "Braveheart Trail System", ["braveheart"]),
    ("buffalo-mountain-wv", "Hatfield-McCoy Buffalo Mountain", ["buffalo mountain"]),
    ("cabwaylingo-wv", "Cabwaylingo Trail System", ["cabwaylingo"]),
    ("devil-anse-wv", "Hatfield-McCoy Devil Anse", ["devil anse"]),
    ("indian-ridge-wv", "Indian Ridge Trail System", ["indian ridge"]),
    ("ivy-branch-wv", "Ivy Branch Trail System", ["ivy branch"]),
    ("pinnacle-creek-wv", "Pinnacle Creek Trail System", ["pinnacle creek"]),
    ("pocahontas-wv", "Pocahontas Trail System", ["pocahontas"]),
    ("rockhouse-wv", "Hatfield-McCoy Rockhouse", ["rockhouse", "rock house"]),
    ("tornado-wv", "Tornado Single Trax Trail System", ["tornado", "single trax", "single track"]),
    ("warrior-wv", "Warrior Trail System", ["warrior"]),
]


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def read_kml(path: Path) -> bytes:
    if path.suffix.lower() == ".kmz":
        with zipfile.ZipFile(path) as archive:
            kml_names = [name for name in archive.namelist() if name.lower().endswith(".kml")]
            if not kml_names:
                raise SystemExit(f"No .kml file found inside {path}")
            preferred = next((name for name in kml_names if name.lower().endswith("doc.kml")), kml_names[0])
            return archive.read(preferred)
    return path.read_bytes()


def child_text(element: ElementTree.Element, child_name: str) -> str:
    for child in element:
        if local_name(child.tag) == child_name:
            return (child.text or "").strip()
    return ""


def iter_placemarks(element: ElementTree.Element, ancestors: list[str] | None = None):
    ancestors = ancestors or []
    name = child_text(element, "name")
    next_ancestors = ancestors
    if local_name(element.tag) in {"Document", "Folder"} and name:
        next_ancestors = [*ancestors, name]

    if local_name(element.tag) == "Placemark":
        yield element, ancestors

    for child in element:
        yield from iter_placemarks(child, next_ancestors)


def iter_coordinate_blocks(placemark: ElementTree.Element):
    for element in placemark.iter():
        if local_name(element.tag) == "LineString":
            for child in element:
                if local_name(child.tag) == "coordinates" and child.text:
                    yield child.text


def parse_coordinates(value: str):
    coordinates = []
    for raw_coordinate in value.split():
        parts = raw_coordinate.split(",")
        if len(parts) < 2:
            continue
        try:
            longitude = float(parts[0])
            latitude = float(parts[1])
        except ValueError:
            continue
        coordinates.append({"latitude": round(latitude, 6), "longitude": round(longitude, 6)})
    return coordinates


def match_system(search_text: str):
    normalized = normalize(search_text)
    for area_slug, trail_name, keywords in SYSTEMS:
        if any(keyword in normalized for keyword in keywords):
            return area_slug, trail_name
    return None


def extract_routes(kml_bytes: bytes):
    root = ElementTree.fromstring(kml_bytes)
    grouped: dict[tuple[str, str], list[list[dict[str, float]]]] = {}
    unmatched = 0

    for placemark, ancestors in iter_placemarks(root):
        placemark_name = child_text(placemark, "name")
        search_text = " ".join([*ancestors, placemark_name])
        system = match_system(search_text)
        if not system:
            unmatched += 1
            continue

        for coordinate_block in iter_coordinate_blocks(placemark):
            segment = parse_coordinates(coordinate_block)
            if len(segment) >= 2:
                grouped.setdefault(system, []).append(segment)

    routes = [
        {"areaSlug": area_slug, "trailName": trail_name, "segments": segments}
        for (area_slug, trail_name), segments in sorted(grouped.items())
        if segments
    ]
    return routes, unmatched


def write_routes(output_path: Path, routes: list[dict]) -> None:
    route_json = json.dumps(routes, indent=2)
    output_path.write_text(
        "\n".join(
            [
                'import type { TrailCoordinate } from "./types";',
                "",
                "export type HatfieldMcCoyTrailRoute = {",
                "  areaSlug: string;",
                "  trailName: string;",
                "  segments: TrailCoordinate[][];",
                "};",
                "",
                "// Generated by scripts/import_hatfield_mccoy_kmz.py from official Hatfield-McCoy GIS/KMZ data.",
                f"export const hatfieldMcCoyTrailRoutes: HatfieldMcCoyTrailRoute[] = {route_json};",
                "",
            ],
        ),
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Import official Hatfield-McCoy KMZ/KML trail geometry.")
    parser.add_argument("source", type=Path, help="Path to the Trails Heaven .kmz or .kml download")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    if not args.source.exists():
        print(f"Missing source file: {args.source}", file=sys.stderr)
        return 1

    routes, unmatched = extract_routes(read_kml(args.source))
    if not routes:
        print("No matching Hatfield-McCoy LineString routes found.", file=sys.stderr)
        return 1

    write_routes(args.output, routes)
    segment_count = sum(len(route["segments"]) for route in routes)
    print(f"Wrote {len(routes)} trail systems with {segment_count} route segments to {args.output}")
    if unmatched:
        print(f"Skipped {unmatched} unmatched placemarks.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
