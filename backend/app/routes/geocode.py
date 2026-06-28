import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(tags=["geocoding"])


@router.get("/geocode")
def geocode_location(query: str = Query(min_length=3, max_length=220)) -> dict[str, str | float]:
    params = urlencode(
        {
            "format": "jsonv2",
            "limit": 1,
            "q": query,
            "countrycodes": "us",
        },
    )
    request = Request(
        f"https://nominatim.openstreetmap.org/search?{params}",
        headers={
            "Accept": "application/json",
            "User-Agent": "AppalachiaOffroadApp/1.0",
        },
    )

    try:
        with urlopen(request, timeout=6) as response:
            results = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail="Unable to search that location") from exc

    if not results:
        raise HTTPException(status_code=404, detail="No matching location found")

    match = results[0]
    return {
        "display_name": match.get("display_name", query),
        "latitude": float(match["lat"]),
        "longitude": float(match["lon"]),
    }
