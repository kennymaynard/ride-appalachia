from dataclasses import dataclass
from datetime import date, datetime
from urllib.error import URLError
from urllib.request import Request, urlopen

from sqlalchemy.orm import Session

from app.models import ListingCalendar, ListingCalendarBlock


@dataclass
class CalendarBlock:
    source_uid: str
    start_date: str
    end_date: str
    summary: str = ""


def unfold_ical_lines(raw_text: str) -> list[str]:
    lines: list[str] = []
    for line in raw_text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        if line.startswith((" ", "\t")) and lines:
            lines[-1] += line[1:]
        else:
            lines.append(line)
    return lines


def parse_ical_date(value: str) -> str:
    cleaned = value.strip()
    if "T" in cleaned:
        return datetime.strptime(cleaned[:8], "%Y%m%d").date().isoformat()
    return datetime.strptime(cleaned[:8], "%Y%m%d").date().isoformat()


def parse_ical_blocks(raw_text: str) -> list[CalendarBlock]:
    blocks: list[CalendarBlock] = []
    event: dict[str, str] | None = None

    for line in unfold_ical_lines(raw_text):
        if line == "BEGIN:VEVENT":
            event = {}
            continue
        if line == "END:VEVENT" and event is not None:
            start_value = event.get("DTSTART", "")
            end_value = event.get("DTEND", "")
            if start_value and end_value:
                blocks.append(
                    CalendarBlock(
                        source_uid=event.get("UID", ""),
                        start_date=parse_ical_date(start_value),
                        end_date=parse_ical_date(end_value),
                        summary=event.get("SUMMARY", "")[:220],
                    )
                )
            event = None
            continue
        if event is None or ":" not in line:
            continue

        raw_key, value = line.split(":", 1)
        key = raw_key.split(";", 1)[0]
        if key in {"UID", "DTSTART", "DTEND", "SUMMARY"}:
            event[key] = value

    return [block for block in blocks if block.end_date > date.today().isoformat()]


def fetch_ical_blocks(ical_url: str, timeout_seconds: int = 8) -> list[CalendarBlock]:
    request = Request(ical_url, headers={"User-Agent": "AppalachiaOffroadApp/1.0"})
    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            raw_text = response.read().decode("utf-8", errors="replace")
    except (OSError, URLError) as exc:
        raise RuntimeError(f"Unable to fetch calendar: {exc}") from exc

    return parse_ical_blocks(raw_text)


def sync_calendar_blocks(db: Session, calendar: ListingCalendar) -> tuple[int, str]:
    try:
        blocks = fetch_ical_blocks(calendar.ical_url)
    except RuntimeError as exc:
        calendar.last_sync_status = str(exc)[:120]
        return 0, calendar.last_sync_status

    db.query(ListingCalendarBlock).filter(ListingCalendarBlock.calendar_id == calendar.id).delete()
    for block in blocks:
        db.add(
            ListingCalendarBlock(
                calendar_id=calendar.id,
                listing_id=calendar.listing_id,
                source_uid=block.source_uid,
                start_date=block.start_date,
                end_date=block.end_date,
                summary=block.summary,
            )
        )
    calendar.last_synced_at = datetime.utcnow()
    calendar.last_sync_status = f"Synced {len(blocks)} blocked date range{'s' if len(blocks) != 1 else ''}"
    return len(blocks), calendar.last_sync_status


def sync_active_calendars(db: Session) -> dict[str, int]:
    calendars = (
        db.query(ListingCalendar)
        .filter(ListingCalendar.is_active == True)  # noqa: E712
        .all()
    )
    synced = 0
    failed = 0
    blocked_ranges = 0

    for calendar in calendars:
        count, status = sync_calendar_blocks(db, calendar)
        if status.startswith("Unable to fetch calendar"):
            failed += 1
        else:
            synced += 1
            blocked_ranges += count
        db.commit()

    return {
        "calendars_checked": len(calendars),
        "calendars_synced": synced,
        "calendars_failed": failed,
        "blocked_ranges": blocked_ranges,
    }
