from dataclasses import dataclass
import json
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.database import Settings
from app.schemas import StoreProductRead

PRINTIFY_API_BASE = "https://api.printify.com/v1"


@dataclass
class PrintifyOrderResult:
    submitted: bool
    message: str
    order_id: str = ""


class PrintifyApiError(RuntimeError):
    pass


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


def _get_printify(settings: Settings, path: str) -> dict:
    request = Request(
        f"{PRINTIFY_API_BASE}{path}",
        headers=_printify_headers(settings),
        method="GET",
    )
    try:
        with urlopen(request, timeout=15) as response:
            body = response.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise PrintifyApiError(f"Printify API returned {exc.code}: {detail[:500]}") from exc
    return json.loads(body) if body else {}


def _strip_html(value: str) -> str:
    stripped = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", stripped).strip()


def _slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return slug or "product"


def _visual_for_product(title: str, tags: list[str]) -> str:
    haystack = " ".join([title, *tags]).lower()
    if "hat" in haystack or "cap" in haystack:
        return "hat"
    if "sticker" in haystack:
        return "stickers"
    if "decal" in haystack or "window" in haystack:
        return "window"
    return "shirt"


def _category_for_product(title: str, tags: list[str]) -> str:
    visual = _visual_for_product(title, tags)
    if visual == "hat":
        return "Hats"
    if visual == "stickers":
        return "Trail stickers"
    if visual == "window":
        return "Window stickers"
    return "Shirts"


def _badge_for_product(title: str, tags: list[str]) -> str:
    visual = _visual_for_product(title, tags)
    if visual == "hat":
        return "Trail ready"
    if visual == "stickers":
        return "Sticker pack"
    if visual == "window":
        return "Vehicle decal"
    return "Rider gear"


def _image_for_product(product: dict) -> str:
    images = product.get("images") or []
    if not isinstance(images, list):
        return ""
    default_image = next((image for image in images if image.get("is_default")), None)
    selected_image = default_image or (images[0] if images else {})
    return str(selected_image.get("src") or "")


def _variant_title(product: dict, variant: dict) -> str:
    title = str(variant.get("title") or "").strip()
    if title and title.lower() != "default title":
        return title

    option_values = variant.get("options") or []
    option_groups = product.get("options") or []
    labels: list[str] = []
    if isinstance(option_values, list) and isinstance(option_groups, list):
        for option_index, option_value in enumerate(option_values):
            group = option_groups[option_index] if option_index < len(option_groups) else {}
            values = group.get("values") if isinstance(group, dict) else []
            if isinstance(values, list):
                match = next((value for value in values if value.get("id") == option_value), None)
                if match and match.get("title"):
                    labels.append(str(match["title"]))
                    continue
            labels.append(str(option_value))
    return " / ".join(labels) if labels else "Default"


def _transform_printify_product(product: dict) -> StoreProductRead | None:
    variants = [
        variant
        for variant in product.get("variants") or []
        if variant.get("is_enabled", True) and variant.get("sku")
    ]
    if not variants:
        return None

    title = str(product.get("title") or "Printify product").strip()
    tags = [str(tag) for tag in product.get("tags") or []]
    variant_names = [_variant_title(product, variant) for variant in variants]
    variant_skus = {
        variant_name: str(variant.get("sku") or "")
        for variant_name, variant in zip(variant_names, variants)
        if variant.get("sku")
    }
    prices = [int(variant.get("price") or 0) for variant in variants if int(variant.get("price") or 0) > 0]
    first_sku = next(iter(variant_skus.values()), "")

    return StoreProductRead(
        id=f"printify-{product.get('id') or _slug(title)}",
        name=title,
        category=_category_for_product(title, tags),
        description=_strip_html(str(product.get("description") or "")),
        priceCents=min(prices) if prices else 0,
        dropshipSku=first_sku,
        fulfillment="Printify print-on-demand",
        variants=variant_names,
        variantSkus=variant_skus,
        badge=_badge_for_product(title, tags),
        visual=_visual_for_product(title, tags),
        imageUrl=_image_for_product(product),
        source="printify",
    )


def list_printify_store_products(settings: Settings) -> list[StoreProductRead]:
    if not settings.printify_api_token or not settings.printify_shop_id:
        raise RuntimeError("Printify API token or shop ID is not configured.")

    products: list[StoreProductRead] = []
    response = _get_printify(settings, f"/shops/{settings.printify_shop_id}/products.json")
    data = response.get("data") if isinstance(response, dict) else []
    if not isinstance(data, list):
        return products

    for product in data:
        transformed = _transform_printify_product(product)
        if transformed:
            products.append(transformed)

    current_page = int(response.get("current_page") or 1)
    last_page = int(response.get("last_page") or current_page)
    page = current_page + 1
    while page <= min(last_page, 10):
        page_response = _get_printify(settings, f"/shops/{settings.printify_shop_id}/products.json?page={page}")
        page_data = page_response.get("data") if isinstance(page_response, dict) else []
        if not isinstance(page_data, list) or not page_data:
            break
        for product in page_data:
            transformed = _transform_printify_product(product)
            if transformed:
                products.append(transformed)
        page += 1

    return products


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
