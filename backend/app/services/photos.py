from urllib.parse import urlparse


CATEGORY_FALLBACK_PHOTOS = {
    "lodging": "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1200&q=80",
    "food": "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
    "rentals": "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
    "repairs": "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1200&q=80",
    "fuel": "https://images.unsplash.com/photo-1541410965313-d53b3c16ef17?auto=format&fit=crop&w=1200&q=80",
    "services": "https://images.unsplash.com/photo-1581092921461-7d65ca45393a?auto=format&fit=crop&w=1200&q=80",
}

DIRECT_IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif")
MAX_EMBEDDED_PHOTO_CHARS = 3_000_000
TRUSTED_IMAGE_HOSTS = {
    "images.unsplash.com",
    "plus.unsplash.com",
    "images.pexels.com",
    "cdn.pixabay.com",
}
BLOCKED_SOCIAL_HOST_PARTS = (
    "facebook.",
    "instagram.",
    "tiktok.",
    "youtube.",
    "youtu.be",
)


def fallback_photo_for_category(category: str) -> str:
    return CATEGORY_FALLBACK_PHOTOS.get(category, CATEGORY_FALLBACK_PHOTOS["lodging"])


def is_oversized_embedded_photo(photo_url: str) -> bool:
    return photo_url.startswith("data:image/") and len(photo_url) > MAX_EMBEDDED_PHOTO_CHARS


def is_valid_photo_url(photo_url: str) -> bool:
    if not photo_url:
        return False

    if photo_url.startswith("data:image/"):
        return not is_oversized_embedded_photo(photo_url)

    parsed_url = urlparse(photo_url.strip())
    hostname = (parsed_url.hostname or "").lower()
    path = parsed_url.path.lower()

    if parsed_url.scheme not in {"http", "https"} or not hostname:
        return False

    if any(blocked_host in hostname for blocked_host in BLOCKED_SOCIAL_HOST_PARTS):
        return False

    return hostname in TRUSTED_IMAGE_HOSTS or path.endswith(DIRECT_IMAGE_EXTENSIONS)


def normalize_photo_url(photo_url: str, category: str) -> str:
    if is_valid_photo_url(photo_url):
        return photo_url.strip()

    return fallback_photo_for_category(category)
