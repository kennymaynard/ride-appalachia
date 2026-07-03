#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import struct
import sys
import zipfile
import math
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


def read_zip_member(path: Path, suffix: str) -> bytes:
    with zipfile.ZipFile(path) as archive:
        names = [name for name in archive.namelist() if name.lower().endswith(suffix)]
        if not names:
            raise SystemExit(f"No {suffix} file found inside {path}")
        return archive.read(names[0])


def parse_dbf(dbf: bytes) -> list[dict[str, str]]:
    record_count = struct.unpack("<I", dbf[4:8])[0]
    header_length = struct.unpack("<H", dbf[8:10])[0]
    record_length = struct.unpack("<H", dbf[10:12])[0]
    fields: list[tuple[str, int]] = []
    offset = 32
    while dbf[offset] != 0x0D:
        descriptor = dbf[offset : offset + 32]
        name = descriptor[:11].split(b"\0", 1)[0].decode("ascii", "ignore")
        length = descriptor[16]
        fields.append((name, length))
        offset += 32

    records = []
    for index in range(record_count):
        start = header_length + index * record_length
        record = dbf[start : start + record_length]
        if not record or record[0:1] == b"*":
            continue
        position = 1
        values = {}
        for name, length in fields:
            values[name] = record[position : position + length].decode("latin1", "ignore").strip()
            position += length
        records.append(values)
    return records


def utm17n_to_lat_lon(easting: float, northing: float) -> dict[str, float]:
    # NAD83 UTM Zone 17N. NAD83 and WGS84 are close enough for web map display here.
    semi_major = 6378137.0
    flattening_inverse = 298.257222101
    flattening = 1 / flattening_inverse
    eccentricity_squared = flattening * (2 - flattening)
    eccentricity_prime_squared = eccentricity_squared / (1 - eccentricity_squared)
    scale = 0.9996
    central_meridian = math.radians(-81.0)

    x = easting - 500000.0
    y = northing
    meridional_arc = y / scale
    mu = meridional_arc / (
        semi_major
        * (
            1
            - eccentricity_squared / 4
            - 3 * eccentricity_squared**2 / 64
            - 5 * eccentricity_squared**3 / 256
        )
    )
    e1 = (1 - math.sqrt(1 - eccentricity_squared)) / (1 + math.sqrt(1 - eccentricity_squared))
    footprint_latitude = (
        mu
        + (3 * e1 / 2 - 27 * e1**3 / 32) * math.sin(2 * mu)
        + (21 * e1**2 / 16 - 55 * e1**4 / 32) * math.sin(4 * mu)
        + (151 * e1**3 / 96) * math.sin(6 * mu)
        + (1097 * e1**4 / 512) * math.sin(8 * mu)
    )

    sin_footprint = math.sin(footprint_latitude)
    cos_footprint = math.cos(footprint_latitude)
    tan_footprint = math.tan(footprint_latitude)
    radius_curvature = semi_major / math.sqrt(1 - eccentricity_squared * sin_footprint**2)
    radius_meridian = (
        semi_major
        * (1 - eccentricity_squared)
        / (1 - eccentricity_squared * sin_footprint**2) ** 1.5
    )
    t = tan_footprint**2
    c = eccentricity_prime_squared * cos_footprint**2
    d = x / (radius_curvature * scale)

    latitude = footprint_latitude - (
        radius_curvature
        * tan_footprint
        / radius_meridian
        * (
            d**2 / 2
            - (5 + 3 * t + 10 * c - 4 * c**2 - 9 * eccentricity_prime_squared) * d**4 / 24
            + (
                61
                + 90 * t
                + 298 * c
                + 45 * t**2
                - 252 * eccentricity_prime_squared
                - 3 * c**2
            )
            * d**6
            / 720
        )
    )
    longitude = central_meridian + (
        d
        - (1 + 2 * t + c) * d**3 / 6
        + (5 - 2 * c + 28 * t - 3 * c**2 + 8 * eccentricity_prime_squared + 24 * t**2)
        * d**5
        / 120
    ) / cos_footprint

    return {"latitude": round(math.degrees(latitude), 6), "longitude": round(math.degrees(longitude), 6)}


def parse_shp_polyline_segments(shp: bytes) -> list[list[dict[str, float]]]:
    segments: list[list[dict[str, float]]] = []
    offset = 100
    while offset + 8 <= len(shp):
        _record_number, content_length_words = struct.unpack(">2i", shp[offset : offset + 8])
        content_start = offset + 8
        content_length = content_length_words * 2
        content = shp[content_start : content_start + content_length]
        offset = content_start + content_length
        if len(content) < 44:
            continue
        shape_type = struct.unpack("<i", content[:4])[0]
        if shape_type not in {3, 13, 23}:
            continue
        num_parts, num_points = struct.unpack("<2i", content[36:44])
        parts_offset = 44
        points_offset = parts_offset + num_parts * 4
        parts = list(struct.unpack(f"<{num_parts}i", content[parts_offset:points_offset]))
        parts.append(num_points)
        points = [
            struct.unpack("<2d", content[points_offset + point_index * 16 : points_offset + (point_index + 1) * 16])
            for point_index in range(num_points)
        ]
        for part_index in range(num_parts):
            start = parts[part_index]
            end = parts[part_index + 1]
            segment = [utm17n_to_lat_lon(easting, northing) for easting, northing in points[start:end]]
            if len(segment) >= 2:
                segments.append(segment)
    return segments


def extract_shapefile_routes(path: Path):
    shp = read_zip_member(path, ".shp") if path.suffix.lower() == ".zip" else path.read_bytes()
    dbf_path = path.with_suffix(".dbf")
    dbf = read_zip_member(path, ".dbf") if path.suffix.lower() == ".zip" else dbf_path.read_bytes()
    records = parse_dbf(dbf)
    shape_segments = parse_shp_polyline_segments(shp)
    grouped: dict[tuple[str, str], list[list[dict[str, float]]]] = {}
    unmatched = 0

    for record, segment in zip(records, shape_segments):
        system = match_system(record.get("Trail_Syst", ""))
        if not system:
            unmatched += 1
            continue
        grouped.setdefault(system, []).append(segment)

    routes = [
        {"areaSlug": area_slug, "trailName": trail_name, "segments": segments}
        for (area_slug, trail_name), segments in sorted(grouped.items())
        if segments
    ]
    return routes, unmatched


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

    if args.source.suffix.lower() == ".zip" or args.source.suffix.lower() == ".shp":
        routes, unmatched = extract_shapefile_routes(args.source)
    else:
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
