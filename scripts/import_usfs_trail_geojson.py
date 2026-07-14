#!/usr/bin/env python3
"""Generate a typed route module from an official USFS trail GeoJSON query."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def geometry_segments(geometry: dict) -> list[list[dict[str, float]]]:
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates", [])
    lines = [coordinates] if geometry_type == "LineString" else coordinates if geometry_type == "MultiLineString" else []
    return [
        [{"latitude": round(latitude, 6), "longitude": round(longitude, 6)} for longitude, latitude, *_ in line]
        for line in lines
        if len(line) >= 2
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--admin-org", required=True)
    parser.add_argument("--trail-number", action="append", required=True)
    parser.add_argument("--export-name", required=True)
    args = parser.parse_args()

    payload = json.loads(args.source.read_text())
    segments: list[list[dict[str, float]]] = []
    for feature in payload.get("features", []):
        properties = feature.get("properties", {})
        if str(properties.get("admin_org")) != args.admin_org:
            continue
        if str(properties.get("trail_no")) not in args.trail_number:
            continue
        segments.extend(geometry_segments(feature.get("geometry", {})))

    if not segments:
        raise SystemExit("No matching USFS trail geometry found")

    output = "\n".join(
        [
            'import type { TrailCoordinate } from "./types";',
            "",
            "// Generated from the USDA Forest Service National Forest System Trails service.",
            f"export const {args.export_name}: TrailCoordinate[][] = {json.dumps(segments, separators=(',', ':'))};",
            "",
        ]
    )
    args.output.write_text(output)
    print(f"Wrote {len(segments)} verified route segments to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
