from pathlib import Path

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "marketing" / "appalachia-offroad-business-flyer.pdf"
LOGO = ROOT / "marketing" / "ride-appalachia-logo-tight.png"
HERO = ROOT / "frontend" / "public" / "appalachia-offroad-hero.png"
SIGNUP_URL = "https://appalachiaoffroadapp.com/business/join"


def hex_color(value: str) -> colors.Color:
    return colors.HexColor(value)


ORANGE = hex_color("#f26a1b")
GOLD = hex_color("#eab64d")
GREEN = hex_color("#62a878")
CHARCOAL = hex_color("#090909")
PANEL = hex_color("#141414")
SOFT = hex_color("#f7eee5")
MUTED = hex_color("#bdb5aa")


def draw_paragraph(c: canvas.Canvas, text: str, x: float, y: float, w: float, style: ParagraphStyle) -> float:
    paragraph = Paragraph(text, style)
    _, h = paragraph.wrap(w, 1000)
    paragraph.drawOn(c, x, y - h)
    return y - h


def draw_badge(c: canvas.Canvas, text: str, x: float, y: float, w: float) -> None:
    c.setFillColor(colors.Color(0, 0, 0, alpha=0.56))
    c.setStrokeColor(colors.Color(1, 1, 1, alpha=0.18))
    c.roundRect(x, y, w, 21, 7, stroke=1, fill=1)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 7.8)
    c.drawCentredString(x + w / 2, y + 7.2, text.upper())


def draw_qr(c: canvas.Canvas, x: float, y: float, size: float) -> None:
    qr = QrCodeWidget(SIGNUP_URL)
    bounds = qr.getBounds()
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    drawing = Drawing(size, size, transform=[size / width, 0, 0, size / height, 0, 0])
    drawing.add(qr)
    c.setFillColor(colors.white)
    c.roundRect(x - 8, y - 8, size + 16, size + 16, 10, stroke=0, fill=1)
    renderPDF.draw(drawing, c, x, y)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=letter)
    width, height = letter
    margin = 0.42 * inch

    # Background
    c.setFillColor(CHARCOAL)
    c.rect(0, 0, width, height, stroke=0, fill=1)
    c.drawImage(str(HERO), 0, height - 3.72 * inch, width=width, height=3.72 * inch, preserveAspectRatio=True, anchor="c")
    c.setFillColor(colors.Color(0, 0, 0, alpha=0.78))
    c.rect(0, height - 3.72 * inch, width, 3.72 * inch, stroke=0, fill=1)
    c.setFillColor(colors.Color(0.95, 0.36, 0.07, alpha=0.9))
    c.rect(0, height - 3.76 * inch, width * 0.62, 0.05 * inch, stroke=0, fill=1)
    c.setFillColor(colors.Color(0.39, 0.66, 0.47, alpha=0.9))
    c.rect(width * 0.62, height - 3.76 * inch, width * 0.38, 0.05 * inch, stroke=0, fill=1)

    # Header
    logo_w = 3.05 * inch
    c.drawImage(str(LOGO), margin, height - margin - 1.34 * inch, width=logo_w, height=1.34 * inch, preserveAspectRatio=True, mask="auto")
    draw_badge(c, "Founding business partners", width - margin - 2.28 * inch, height - margin - 0.42 * inch, 2.28 * inch)

    eyebrow = ParagraphStyle(
        "eyebrow",
        fontName="Helvetica-Bold",
        fontSize=8.4,
        leading=10,
        textColor=ORANGE,
        spaceAfter=6,
        alignment=TA_LEFT,
    )
    h1 = ParagraphStyle(
        "h1",
        fontName="Helvetica-Bold",
        fontSize=33,
        leading=32,
        textColor=colors.white,
        alignment=TA_LEFT,
    )
    h2 = ParagraphStyle(
        "h2",
        fontName="Helvetica-Bold",
        fontSize=29,
        leading=30,
        textColor=colors.white,
        alignment=TA_LEFT,
    )
    lead = ParagraphStyle(
        "lead",
        fontName="Helvetica-Bold",
        fontSize=12.2,
        leading=15.4,
        textColor=SOFT,
        alignment=TA_LEFT,
    )
    body = ParagraphStyle(
        "body",
        fontName="Helvetica",
        fontSize=9.5,
        leading=12.5,
        textColor=SOFT,
        alignment=TA_LEFT,
    )
    small = ParagraphStyle(
        "small",
        fontName="Helvetica-Bold",
        fontSize=8.2,
        leading=10.2,
        textColor=MUTED,
        alignment=TA_LEFT,
    )
    center_small = ParagraphStyle(
        "center_small",
        fontName="Helvetica-Bold",
        fontSize=8.2,
        leading=10.2,
        textColor=MUTED,
        alignment=TA_CENTER,
    )

    y = height - 1.78 * inch
    y = draw_paragraph(c, "THE OFFROAD HOME BASE FOR APPALACHIA", margin, y, 4.8 * inch, eyebrow) - 0.05 * inch
    y = draw_paragraph(c, "Reach Offroad Riders Before They Hit Town", margin, y, 5.15 * inch, h1) - 0.13 * inch
    y = draw_paragraph(
        c,
        "List your lodging, restaurant, repair shop, recovery service, campground, outfitter, fuel stop, or local business where ATV, UTV, Jeep, and SxS riders are planning trips.",
        margin,
        y,
        5.3 * inch,
        lead,
    )

    # QR card
    qr_x = width - margin - 1.42 * inch
    qr_y = height - 3.08 * inch
    draw_qr(c, qr_x, qr_y, 1.24 * inch)
    draw_paragraph(c, "Scan to join", qr_x - 0.16 * inch, qr_y - 0.16 * inch, 1.56 * inch, center_small)

    # Main cards
    top = height - 4.18 * inch
    card_gap = 0.16 * inch
    card_w = (width - margin * 2 - card_gap * 2) / 3
    cards = [
        ("Riders Are Searching", "Trails, lodging, food, recovery, repairs, fuel, events, and deals across Appalachia."),
        ("Real Local Listings", "Only approved, real businesses appear publicly. No fake marketplace filler."),
        ("Plans Start at $29", "Choose the tier that fits your business: local listing, lodging, featured placement, sponsorship, or cleaner partner."),
    ]
    for i, (title, copy) in enumerate(cards):
        x = margin + i * (card_w + card_gap)
        c.setFillColor(PANEL)
        c.setStrokeColor(colors.Color(1, 1, 1, alpha=0.14))
        c.roundRect(x, top - 1.32 * inch, card_w, 1.32 * inch, 8, stroke=1, fill=1)
        draw_paragraph(c, title.upper(), x + 0.13 * inch, top - 0.18 * inch, card_w - 0.26 * inch, eyebrow)
        draw_paragraph(c, copy, x + 0.13 * inch, top - 0.52 * inch, card_w - 0.26 * inch, body)

    # Pricing section
    pricing_y = top - 1.72 * inch
    after_heading = draw_paragraph(c, "Simple Monthly Tiers", margin, pricing_y, 4.25 * inch, h2)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(MUTED)
    c.drawString(margin, after_heading - 0.16 * inch, "Pick the plan that matches how visible you want to be.")

    tiers = [
        ("$29", "Local Business", "Food, fuel, repair, recovery, outfitters, local shops"),
        ("$59", "Lodging Partner", "Cabins, campgrounds, hotels, trailer-friendly stays"),
        ("$99", "Featured Partner", "Priority category placement and expanded visibility"),
        ("$149", "Monthly Sponsor", "Ride-area sponsorship and campaign visibility"),
        ("$29.99", "Cleaner Partner", "Lodging turnover opportunities"),
    ]
    table_x = margin
    table_y = after_heading - 0.42 * inch
    row_h = 0.38 * inch
    for index, (price, name, best_for) in enumerate(tiers):
        y_row = table_y - index * row_h
        c.setFillColor(colors.Color(1, 1, 1, alpha=0.035 if index % 2 == 0 else 0.065))
        c.roundRect(table_x, y_row - row_h + 3, width - margin * 2, row_h - 4, 5, stroke=0, fill=1)
        c.setFillColor(ORANGE if index == 0 else GOLD)
        c.setFont("Helvetica-Bold", 14 if index == 0 else 12)
        c.drawString(table_x + 0.12 * inch, y_row - 0.24 * inch, price)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(table_x + 0.95 * inch, y_row - 0.23 * inch, name)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 8.4)
        c.drawString(table_x + 2.35 * inch, y_row - 0.23 * inch, best_for)

    # CTA band
    band_y = 0.82 * inch
    c.setFillColor(colors.Color(0.95, 0.36, 0.07, alpha=0.98))
    c.roundRect(margin, band_y, width - margin * 2, 0.82 * inch, 10, stroke=0, fill=1)
    c.setFillColor(hex_color("#160801"))
    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin + 0.2 * inch, band_y + 0.47 * inch, "Get listed before public rider promotion ramps up.")
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(margin + 0.2 * inch, band_y + 0.22 * inch, "appalachiaoffroadapp.com/business/join")

    c.setFillColor(SOFT)
    c.setFont("Helvetica-Bold", 8.2)
    c.drawCentredString(width / 2, 0.38 * inch, "Built for ATV, UTV, Jeep, and SxS riders across Kentucky, West Virginia, Virginia, Tennessee, Ohio, and nearby trail towns.")

    c.save()
    print(OUT)


if __name__ == "__main__":
    main()
