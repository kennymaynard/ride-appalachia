from dataclasses import dataclass
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.database import Settings

PRINTIFY_API_BASE = "https://api.printify.com/v1"


@dataclass
class PrintifyOrderResult:
    submitted: bool
    message: str
    order_id: str = ""


def _printify_headers(settings: Settings) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.printify_api_token}",
        "Content-Type": "application/json;charset=utf-8",
        "User-Agent": "AppalachiaOffroad/1.0",
    }


def _post_printify(settings: Settings, path: str, payload: dict) -> dict:
    request = Request(
        f"{PRINTIFY_API_BASE}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers=_printify_headers(settings),
        method="POST",
    )
    with urlopen(request, timeout=15) as response:
        body = response.read().decode("utf-8")
    return json.loads(body) if body else {}


def _split_name(name: str) -> tuple[str, str]:
    parts = [part for part in name.strip().split(" ") if part]
    if not parts:
        return ("Appalachia", "Rider")
    if len(parts) == 1:
        return (parts[0], "Rider")
    return (parts[0], " ".join(parts[1:]))


def _parse_store_items(items_metadata: str) -> list[dict[str, str | int]]:
    items = []
    for index, raw_item in enumerate(items_metadata.split("; ")):
        parts = raw_item.split(":", 3)
        if len(parts) != 4:
            continue
        product_id, variant, quantity, sku = parts
        if not sku:
            continue
        try:
            parsed_quantity = max(1, min(int(quantity), 10))
        except ValueError:
            parsed_quantity = 1
        items.append(
            {
                "sku": sku,
                "quantity": parsed_quantity,
                "external_id": f"{product_id}-{index + 1}",
                "variant": variant,
            }
        )
    return items


def _parse_stripe_line_items(line_items: list[dict]) -> list[dict[str, str | int]]:
    items = []
    for index, line_item in enumerate(line_items):
        price = line_item.get("price") or {}
        product = price.get("product") or {}
        product_metadata = product.get("metadata") if isinstance(product, dict) else {}
        sku = (product_metadata or {}).get("dropship_sku") or ""
        if not sku:
            continue
        items.append(
            {
                "sku": sku,
                "quantity": max(1, min(int(line_item.get("quantity") or 1), 10)),
                "external_id": f"{(product_metadata or {}).get('product_id') or 'store-item'}-{index + 1}",
                "variant": (product_metadata or {}).get("variant") or "",
            }
        )
    return items


def build_printify_order_payload(session: dict, settings: Settings, line_items: list[dict] | None = None) -> dict:
    metadata = session.get("metadata") or {}
    shipping_details = session.get("shipping_details") or {}
    customer_details = session.get("customer_details") or {}
    address = shipping_details.get("address") or {}
    first_name, last_name = _split_name(shipping_details.get("name") or customer_details.get("name") or "")
    printify_line_items = _parse_stripe_line_items(line_items or [])
    if not printify_line_items:
        printify_line_items = [
            {
                "sku": str(item["sku"]),
                "quantity": int(item["quantity"]),
                "external_id": str(item["external_id"]),
            }
            for item in _parse_store_items(metadata.get("items") or "")
        ]
    if not printify_line_items:
        raise ValueError("No Printify SKUs were found on the Stripe store order.")
    if not address.get("line1") or not address.get("city") or not address.get("postal_code") or not address.get("country"):
        raise ValueError("Stripe store order is missing a complete shipping address.")

    session_id = session.get("id") or ""
    return {
        "external_id": session_id,
        "label": session_id[-8:] if session_id else "AO-store",
        "line_items": printify_line_items,
        "shipping_method": 1,
        "send_shipping_notification": settings.printify_send_shipping_notification,
        "address_to": {
            "first_name": first_name,
            "last_name": last_name,
            "email": customer_details.get("email") or session.get("customer_email") or settings.lead_notify_email,
            "phone": customer_details.get("phone") or "",
            "country": address.get("country") or "US",
            "region": address.get("state") or "",
            "address1": address.get("line1") or "",
            "address2": address.get("line2") or "",
            "city": address.get("city") or "",
            "zip": address.get("postal_code") or "",
        },
    }


def submit_store_order_from_stripe_session(
    session: dict,
    settings: Settings,
    line_items: list[dict] | None = None,
) -> PrintifyOrderResult:
    metadata = session.get("metadata") or {}
    if metadata.get("order_type") != "merch":
        return PrintifyOrderResult(submitted=False, message="Not a merch order.")
    if not settings.printify_auto_submit_orders:
        return PrintifyOrderResult(submitted=False, message="Printify auto-submit is disabled.")
    if not settings.printify_api_token or not settings.printify_shop_id:
        return PrintifyOrderResult(submitted=False, message="Printify API token or shop ID is not configured.")

    try:
        payload = build_printify_order_payload(session, settings, line_items)
        response = _post_printify(settings, f"/shops/{settings.printify_shop_id}/orders.json", payload)
    except ValueError as exc:
        return PrintifyOrderResult(submitted=False, message=str(exc))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        return PrintifyOrderResult(
            submitted=False,
            message=f"Printify rejected the order: {exc.code} {detail[:500]}",
        )
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        return PrintifyOrderResult(submitted=False, message=f"Unable to submit Printify order: {exc}")

    order_id = str(response.get("id") or "")
    return PrintifyOrderResult(
        submitted=bool(order_id),
        order_id=order_id,
        message=f"Printify order submitted: {order_id}" if order_id else "Printify response did not include an order id.",
    )
