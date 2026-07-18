import json
from urllib.request import Request, urlopen

from app.database import get_settings
from app.models import ExploreDestination


def build_ai_plan(destinations: list[ExploreDestination], days: int, preferences: dict[str, bool]) -> list[dict]:
    settings = get_settings()
    if not settings.openai_api_key.strip():
        raise RuntimeError("AI planning is not configured")
    allowed = [{"id": row.id, "name": row.name, "category": row.category, "city": row.city, "state": row.state, "description": row.short_description} for row in destinations]
    schema = {"type": "object", "properties": {"stops": {"type": "array", "items": {"type": "object", "properties": {"destination_id": {"type": "integer"}, "day": {"type": "integer"}, "notes": {"type": "string"}}, "required": ["destination_id", "day", "notes"], "additionalProperties": False}}}, "required": ["stops"], "additionalProperties": False}
    prompt = "Build a practical Appalachian trip. Use only supplied destination IDs. Balance lodging, meals, and activities. Never invent a destination. " + json.dumps({"days": days, "preferences": preferences, "destinations": allowed})
    payload = {"model": settings.openai_trip_model, "input": prompt, "max_output_tokens": 1800, "text": {"format": {"type": "json_schema", "name": "appalachia_trip", "strict": True, "schema": schema}}}
    request = Request("https://api.openai.com/v1/responses", data=json.dumps(payload).encode(), method="POST", headers={"Authorization": f"Bearer {settings.openai_api_key}", "Content-Type": "application/json"})
    with urlopen(request, timeout=35) as response:
        result = json.load(response)
    output_text = result.get("output_text") or next((part.get("text", "") for item in result.get("output", []) for part in item.get("content", []) if part.get("type") == "output_text"), "")
    stops = json.loads(output_text).get("stops", [])
    allowed_ids = {row.id for row in destinations}
    return [stop for stop in stops if stop.get("destination_id") in allowed_ids and 1 <= int(stop.get("day", 0)) <= days][: days * 4]
