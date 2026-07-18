"""Compliant, allow-list-only event discovery and normalization."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from difflib import SequenceMatcher
from hashlib import sha256
from html.parser import HTMLParser
from html import unescape
import json
import re
from time import monotonic
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser
from xml.etree import ElementTree

from sqlalchemy.orm import Session

from app.models import Event, EventCandidate, EventSource, EventSourceScan

USER_AGENT = "AppalachiaOffroad-EventDiscovery/1.0 (+https://appalachiaoffroadapp.com/contact)"
TERRITORY = {"KY", "WV", "VA", "TN", "NC"}
SOURCE_TYPES = {"official_website", "official_event_calendar", "tourism_calendar", "rss", "ical", "public_api", "registration_platform", "approved_social_page", "manual"}
KEYWORDS = ("trail ride", "night ride", "group ride", "utv", "sxs", "atv", "jeep", "poker run", "charity ride", "off road", "jamboree", "trail fest", "trailfest", "mud event", "rock crawl", "overland", "dual sport", "adventure rally")
TRACKING_KEYS = {"fbclid", "gclid", "mc_cid", "mc_eid"}
OFFICIAL_VENUE_COORDINATES = {
    ("TN", "Windrock Park"): (36.0521794, -84.3369551),
    ("TN", "Pretty Place Offroad"): (35.1292509, -86.1866532),
    ("TN", "DMRA Adventure Center"): (36.4745636, -81.8048380),
    ("KY", "Leatherwood Off-Road Park"): (37.0453029, -83.1644889),
    ("KY", "Rush Off-Road"): (38.3353600, -82.7815527),
    ("NC", "Denton FarmPark"): (35.5858411, -80.0703203),
    ("WV", "Hatfield-McCoy Trails"): (37.6108224, -81.8614230),
}

def safe_url(value: str) -> str:
    parsed = urlparse(value.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.username or parsed.password:
        raise ValueError("A public HTTP(S) URL is required")
    query = [(key, val) for key, val in parse_qsl(parsed.query) if not key.lower().startswith("utm_") and key.lower() not in TRACKING_KEYS]
    return urlunparse((parsed.scheme.lower(), parsed.netloc.lower(), parsed.path or "/", "", urlencode(query), ""))

def normalize_title(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", value.lower())).strip()

def score_candidate(item: dict, source: EventSource) -> tuple[int, list[str]]:
    score, reasons = (35 if source.is_trusted else 15), ["trusted source" if source.is_trusted else "source awaiting trust"]
    if item.get("structured"): score += 20; reasons.append("structured Event metadata")
    if item.get("start_date"): score += 15; reasons.append("exact date")
    else: score -= 25; reasons.append("missing or ambiguous date")
    if item.get("city") or item.get("venue") or item.get("address"): score += 10; reasons.append("specific location")
    else: score -= 20; reasons.append("missing location")
    if item.get("registration_url"): score += 10; reasons.append("registration URL")
    if source.organizer_name and source.organizer_name.lower() in str(item.get("organizer", "")).lower(): score += 10; reasons.append("organizer match")
    return max(0, min(100, score)), reasons

def find_duplicate(db: Session, item: dict) -> tuple[Event | None, dict]:
    if not item.get("start_date"): return None, {}
    window_start = item["start_date"] - timedelta(days=30); window_end = item["end_date"] + timedelta(days=30)
    candidates = db.query(Event).filter(Event.state == item.get("state"), Event.start_date <= window_end, Event.end_date >= window_start).all()
    best, best_score = None, 0.0
    for event in candidates:
        title_score = SequenceMatcher(None, normalize_title(event.title), normalize_title(item["title"])).ratio()
        place_match = bool(item.get("city") and event.city.lower() == item["city"].lower())
        score = title_score + (0.2 if place_match else 0)
        if score > best_score: best, best_score = event, score
    if best and best_score >= 0.72:
        overlaps = best.start_date <= item["end_date"] and best.end_date >= item["start_date"]
        return best, {"title_similarity": round(best_score, 2), "date_overlap": overlaps}
    return None, {}

def event_changes(event: Event, item: dict) -> dict:
    changes = {}
    for field in ("title", "start_date", "end_date", "venue", "registration_url"):
        incoming = item.get(field)
        current = getattr(event, field)
        if incoming not in (None, "") and incoming != current:
            changes[field] = {"previous": str(current or ""), "new": str(incoming)}
    text = f"{item.get('title', '')} {item.get('description', '')}".lower()
    if re.search(r"\b(cancelled|canceled|postponed)\b", text):
        changes["event_status"] = {"previous": event.status, "new": "canceled_or_postponed"}
    return changes

class JsonLdParser(HTMLParser):
    def __init__(self): super().__init__(); self.in_json = False; self.buffers: list[str] = []; self.current: list[str] = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and attrs.get("type", "").lower() == "application/ld+json": self.in_json = True; self.current = []
    def handle_data(self, data):
        if self.in_json: self.current.append(data)
    def handle_endtag(self, tag):
        if tag == "script" and self.in_json: self.buffers.append("".join(self.current)); self.in_json = False

def parse_date(value: str | None) -> date | None:
    if not value: return None
    try: return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    except ValueError:
        try: return date.fromisoformat(value[:10])
        except ValueError: return None

def jsonld_items(text: str, source: EventSource) -> list[dict]:
    parser = JsonLdParser(); parser.feed(text); results = []
    for raw in parser.buffers:
        try: data = json.loads(raw)
        except json.JSONDecodeError: continue
        nodes = data.get("@graph", []) if isinstance(data, dict) and "@graph" in data else ([data] if isinstance(data, dict) else data)
        for node in nodes:
            types = node.get("@type", []) if isinstance(node, dict) else []
            if isinstance(types, str): types = [types]
            if "Event" not in types: continue
            location = node.get("location") or {}; address = location.get("address") or {}; organizer = node.get("organizer") or {}
            start = parse_date(node.get("startDate")); end = parse_date(node.get("endDate")) or start
            results.append({"external_id": str(node.get("@id") or node.get("url") or sha256(json.dumps(node, sort_keys=True).encode()).hexdigest()), "source_url": node.get("url") or source.base_url, "title": unescape(str(node.get("name") or "")).strip(), "organizer": organizer.get("name", "") if isinstance(organizer, dict) else str(organizer), "description": re.sub("<[^>]+>", " ", unescape(str(node.get("description") or "")))[:1000], "state": source.state, "city": address.get("addressLocality", "") if isinstance(address, dict) else "", "venue": location.get("name", "") if isinstance(location, dict) else "", "address": address.get("streetAddress", "") if isinstance(address, dict) else str(address), "start_date": start, "end_date": end, "official_url": node.get("url") or source.base_url, "registration_url": node.get("offers", {}).get("url", "") if isinstance(node.get("offers"), dict) else "", "image_url": (node.get("image") or "") if isinstance(node.get("image"), str) else "", "structured": True, "raw_metadata": node})
    return results

def _plain_html(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", value))).strip()

def _event_date_range(value: str) -> tuple[date | None, date | None]:
    def named(month: str, day: str, year: str) -> date:
        return datetime.strptime(f"{month} {day} {year}", "%b %d %Y" if len(month) <= 3 else "%B %d %Y").date()

    cleaned = _plain_html(value).replace("–", "-").replace("—", "-")
    cleaned = re.sub(r"(\d)(?:st|nd|rd|th)\b", r"\1", cleaned, flags=re.I)
    single = re.fullmatch(r"([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})", cleaned)
    if single:
        parsed = named(*single.groups())
        return parsed, parsed
    same_month = re.fullmatch(r"([A-Za-z]+)\s+(\d{1,2})\s*-\s*(\d{1,2}),\s*(\d{4})", cleaned)
    if same_month:
        month, start_day, end_day, year = same_month.groups()
        return named(month, start_day, year), named(month, end_day, year)
    short_month = re.fullmatch(r"([A-Za-z]+)\s+(\d{1,2})(?:\s*-\s*([A-Za-z]+)\s+)?(\d{1,2}),\s*(\d{4})", cleaned)
    if short_month:
        month, start_day, end_month, end_day, year = short_month.groups()
        return named(month, start_day, year), named(end_month or month, end_day, year)
    return None, None

def official_html_items(text: str, source: EventSource) -> list[dict]:
    """Parse allow-listed official park schedules that do not publish Event JSON-LD."""
    host = urlparse(source.base_url).netloc.lower().removeprefix("www.")
    results: list[dict] = []
    if host == "leatherwoodoffroad.com":
        rows = re.findall(r'<div class="lw-date">(.*?)</div>\s*<div class="lw-name">(.*?)</div>', text, re.I | re.S)
        venue, city, address = "Leatherwood Off-Road Park", "Leatherwood", "11802 KY HWY-699, Leatherwood, KY"
    elif host == "rushoffroad.com":
        rows = re.findall(r'<div class="p-6 text-center">\s*<h3[^>]*>(.*?)</h3>\s*<div class="text-orange-300[^>]*>(.*?)</div>', text, re.I | re.S)
        venue, city, address = "Rush Off-Road", "Rush", "100 Four Mile Rd, Rush, KY 41168"
        rows = [(date_text, title) for title, date_text in rows]
    elif host == "windrockpark.com":
        pairs = re.findall(r'<h3 class="elementor-heading-title[^>]*>(.*?)</h3>.{0,700}?<h4 class="elementor-heading-title[^>]*>(.*?)</h4>', text, re.I | re.S)
        rows = [(date_text, title) for title, date_text in pairs]
        venue, city, address = "Windrock Park", "Oliver Springs", "921 Windrock Road, Oliver Springs, TN 37840"
    elif host == "nationaltrailfest.com":
        dates = re.findall(r'(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*\d{1,2},\s*\d{4}', text, re.I)
        rows = [(date_text, "National TrailFest") for date_text in dates[:1]]
        venue, city, address = "Hatfield-McCoy Trails", "Gilbert", "1200 Larry Joe Harless Drive, Gilbert, WV 25621"
    elif host == "nationalrockracing.com":
        heading = re.search(r'<h2 class="h1 hero__title">(.*?)</h2>', text, re.I | re.S)
        subtitle = re.search(r'<div class="hero__subtitle">(.*?)</div>\s*</div>', text, re.I | re.S)
        raw_title = _plain_html(re.split(r'<br\s*/?>', heading.group(1), maxsplit=1, flags=re.I)[0]) if heading else ""
        rows = [(_plain_html(subtitle.group(1)), f"{raw_title} Off-Road Race")] if raw_title and subtitle else []
        if "/pretty-place" in urlparse(source.base_url).path:
            venue, city, address = "Pretty Place Offroad", "Belvidere", "50 Circle E Lane, Belvidere, TN 37306"
        else:
            venue, city, address = "Windrock Park", "Oliver Springs", "555 Windrock Park Lane, Oliver Springs, TN 37840"
    elif host == "devilsbackbonewv.com":
        rows = []
        date_pattern = re.compile(r'((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+)?([A-Za-z]+\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?,\s*\d{4})', re.I)
        for heading in re.findall(r'<h2[^>]*>(.*?)</h2>', text, re.I | re.S):
            plain = _plain_html(heading)
            match = date_pattern.search(plain)
            if match and plain[:match.start()].strip(): rows.append((match.group(2), plain[:match.start()].strip()))
        venue, city, address = "Hatfield-McCoy Trails", "Matewan", "Matewan, WV"
    elif host == "dentonfarmpark.com":
        dates = re.findall(r'<h1[^>]*><strong>([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,\s*\d{4})\s*</strong></h1>', text, re.I)
        rows = [(date_text, "Jeeps on the Farm") for date_text in dates]
        venue, city, address = "Denton FarmPark", "Denton", "1072 Cranford Road, Denton, NC 27239"
    elif host == "jeepjamboreeusa.com":
        titles = re.findall(r'<span class="trip-name">(.*?)</span>', text, re.I | re.S)
        dates = re.findall(r'<p class="trip-detail__label">Dates</p>\s*<p class="trip-detail__value">(.*?)</p>', text, re.I | re.S)
        rows = [(date_text, title) for title, date_text in zip(titles, dates)]
        venue, city, address = "Uwharrie National Forest", "Troy", "Troy, NC"
    else:
        return results
    for date_text, title_html in rows:
        start, end = _event_date_range(date_text)
        title = _plain_html(title_html)
        if not title or not start: continue
        if host == "devilsbackbonewv.com" and "national trail" in title.lower():
            city, address = "Gilbert", "Gilbert, WV"
        latitude, longitude = OFFICIAL_VENUE_COORDINATES.get((source.state, venue), (None, None))
        results.append({"external_id": sha256(f"{host}|{title}|{start}".encode()).hexdigest(), "source_url": source.base_url, "title": title, "organizer": source.organizer_name, "description": f"Official event at {venue}. Confirm current details with the organizer.", "state": source.state, "city": city, "venue": venue, "address": address, "latitude": latitude, "longitude": longitude, "start_date": start, "end_date": end or start, "official_url": source.base_url, "registration_url": "", "image_url": "", "structured": True, "raw_metadata": {"official_html_schedule": True}})
    return results

def rss_items(text: str, source: EventSource) -> list[dict]:
    root = ElementTree.fromstring(text); results = []
    for node in root.findall(".//item") + root.findall(".//{*}entry"):
        def value(name):
            found = node.find(name) or node.find(f"{{*}}{name}"); return (found.text or "").strip() if found is not None else ""
        title, link = value("title"), value("link")
        if not link:
            link_node = node.find("{*}link"); link = link_node.get("href", "") if link_node is not None else ""
        results.append({"external_id": value("guid") or value("id") or link or sha256(title.encode()).hexdigest(), "source_url": link or source.feed_url, "title": title, "description": value("description") or value("summary"), "state": source.state, "start_date": None, "end_date": None, "official_url": link, "structured": False, "raw_metadata": {}})
    return results

def public_api_items(text: str, source: EventSource) -> list[dict]:
    data = json.loads(text); nodes = data if isinstance(data, list) else data.get("events", [])
    results = []
    for node in nodes[:500]:
        if not isinstance(node, dict): continue
        start = parse_date(str(node.get("start_date") or node.get("startDate") or "")); end = parse_date(str(node.get("end_date") or node.get("endDate") or "")) or start
        results.append({"external_id": str(node.get("id") or node.get("external_id") or node.get("url") or sha256(json.dumps(node, sort_keys=True).encode()).hexdigest()), "source_url": node.get("url") or source.feed_url, "title": str(node.get("title") or node.get("name") or ""), "organizer": str(node.get("organizer") or source.organizer_name), "description": str(node.get("description") or "")[:1000], "state": str(node.get("state") or source.state).upper(), "city": str(node.get("city") or ""), "venue": str(node.get("venue") or ""), "address": str(node.get("address") or ""), "start_date": start, "end_date": end, "official_url": node.get("url") or source.base_url, "registration_url": str(node.get("registration_url") or ""), "structured": True, "raw_metadata": node})
    return results

def ical_items(text: str, source: EventSource) -> list[dict]:
    results = []
    for block in text.replace("\r\n ", "").split("BEGIN:VEVENT")[1:]:
        fields = {}
        for line in block.splitlines():
            if ":" in line:
                key, value = line.split(":", 1); fields[key.split(";", 1)[0]] = value.strip()
        start, end = parse_date(fields.get("DTSTART")), parse_date(fields.get("DTEND"))
        results.append({"external_id": fields.get("UID") or sha256(block.encode()).hexdigest(), "source_url": fields.get("URL") or source.feed_url, "title": fields.get("SUMMARY", ""), "description": fields.get("DESCRIPTION", "")[:1000], "state": source.state, "venue": fields.get("LOCATION", ""), "start_date": start, "end_date": end or start, "official_url": fields.get("URL") or source.base_url, "structured": True, "raw_metadata": fields})
    return results

def fetch_source(source: EventSource, timeout: int = 12) -> tuple[list[dict], int]:
    url = safe_url(source.feed_url or source.base_url)
    if source.source_type in {"official_website", "official_event_calendar", "tourism_calendar", "registration_platform"}:
        robots = RobotFileParser(urljoin(url, "/robots.txt")); robots.set_url(urljoin(url, "/robots.txt"))
        try: robots.read()
        except Exception: pass
        if not robots.can_fetch(USER_AGENT, url): raise ValueError("robots.txt disallows scanning")
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html, application/json, application/rss+xml, text/calendar"})
    with urlopen(request, timeout=timeout) as response:
        body = response.read(1_000_000).decode(response.headers.get_content_charset() or "utf-8", errors="replace")
        if source.source_type == "rss": return rss_items(body, source), response.status
        if source.source_type == "ical": return ical_items(body, source), response.status
        if source.source_type == "public_api": return public_api_items(body, source), response.status
        items = jsonld_items(body, source)
        if urlparse(source.base_url).netloc.lower().removeprefix("www.") == "dmra.gov":
            items = [item for item in items if "night ride" in normalize_title(item.get("title", ""))]
            for item in items:
                item["latitude"], item["longitude"] = OFFICIAL_VENUE_COORDINATES[("TN", "DMRA Adventure Center")]
        return (items or official_html_items(body, source)), response.status

def candidate_status(item: dict) -> str:
    title = normalize_title(item.get("title", ""))
    if item.get("state") not in TERRITORY or (item.get("start_date") and item["start_date"] < date.today()): return "ignored"
    if not item.get("start_date") or not (item.get("city") or item.get("venue") or item.get("address")): return "needs_review"
    if not any(keyword in title for keyword in KEYWORDS): return "needs_review"
    return "new"

def scan_source(db: Session, source: EventSource, timeout: int = 12) -> EventSourceScan:
    now = datetime.utcnow()
    if source.scan_locked_at and source.scan_locked_at > now - timedelta(minutes=30): raise ValueError("Source scan already in progress")
    source.scan_locked_at = now; source.last_scanned_at = now; scan = EventSourceScan(source_id=source.id, started_at=now); db.add(scan); db.commit(); started = monotonic()
    try:
        items, response_status = fetch_source(source, timeout); scan.items_seen = len(items); scan.response_status = response_status
        for item in items:
            if not item.get("title"): continue
            item["source_url"] = safe_url(item.get("source_url") or source.base_url); item["state"] = str(item.get("state") or source.state).upper()
            item["end_date"] = item.get("end_date") or item.get("start_date")
            score, reasons = score_candidate(item, source); duplicate, similarity = find_duplicate(db, item); changes = event_changes(duplicate, item) if duplicate else {}
            existing = db.query(EventCandidate).filter_by(source_id=source.id, external_id=str(item["external_id"])[:240]).first()
            values = dict(source_url=item["source_url"], title=item["title"][:180], organizer=item.get("organizer", "")[:180], description=item.get("description", "")[:1000], state=item["state"], city=item.get("city", "")[:120], venue=item.get("venue", "")[:180], address=item.get("address", "")[:240], latitude=item.get("latitude"), longitude=item.get("longitude"), start_date=item.get("start_date"), end_date=item.get("end_date"), official_url=item.get("official_url", ""), registration_url=item.get("registration_url", ""), image_url=item.get("image_url", ""), raw_text=item.get("description", "")[:1000], raw_metadata_json=item.get("raw_metadata", {}), confidence_score=score, confidence_reasons=reasons, duplicate_event_id=duplicate.id if duplicate else None, change_detected=bool(changes), change_summary={**similarity, "fields": changes}, status=("possible_update" if changes else "possible_duplicate") if duplicate else candidate_status(item), last_seen_at=now)
            if existing:
                for key, value in values.items(): setattr(existing, key, value)
                scan.candidates_updated += 1
            else:
                db.add(EventCandidate(source_id=source.id, external_id=str(item["external_id"])[:240], **values)); scan.candidates_created += 1
        source.last_success_at = now; source.last_error = ""; source.consecutive_failures = 0; scan.status = "success"
    except Exception as exc:
        source.last_error = str(exc)[:1000]; source.consecutive_failures += 1; scan.status = "failed"; scan.errors = [str(exc)[:1000]]
        if source.consecutive_failures >= 5: source.is_active = False
    finally:
        source.scan_locked_at = None; scan.completed_at = datetime.utcnow(); scan.duration_ms = int((monotonic() - started) * 1000); db.commit()
    return scan
