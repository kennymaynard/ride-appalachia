import secrets

from sqlalchemy.orm import Session

from app.models import Business, Campaign, Deal, TrailReview


def seed_database(db: Session) -> None:
    if db.query(Business).first():
        return

    businesses = [
        Business(
            name="Rush Ridge Lodging Partner",
            slug="rush-ridge-lodging-partner",
            category="lodging",
            description="Founding partner lodging spot for cabins, campgrounds, or hotels serving riders around Rush, Ashland, Cannonsburg, and Grayson.",
            phone="(606) 000-0001",
            location="Rush, KY",
            photo_url="https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1200&q=80",
            website_url="",
            is_approved=True,
            listing_status="approved",
            is_featured=True,
            subscription_tier="lodging_partner",
            subscription_status="active",
            owner_email="rush-lodging@example.com",
        ),
        Business(
            name="Hatfield Rider Meal Partner",
            slug="hatfield-rider-meal-partner",
            category="food",
            description="Founding partner food spot for restaurants, grills, and group-friendly stops serving hungry riders near Hatfield and South Williamson.",
            phone="(606) 000-0002",
            location="Hatfield, KY",
            photo_url="https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
            website_url="",
            is_approved=True,
            listing_status="approved",
            is_featured=True,
            subscription_tier="monthly_sponsor",
            subscription_status="active",
            owner_email="hatfield-food@example.com",
        ),
        Business(
            name="Inez ATV Rental Partner",
            slug="inez-atv-rental-partner",
            category="rentals",
            description="Founding partner rental spot for ATV and UTV operators offering machines, helmets, pickup windows, and ride-area advice around Inez.",
            phone="(606) 000-0003",
            location="Inez, KY",
            photo_url="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
            website_url="",
            is_approved=True,
            listing_status="approved",
            is_featured=False,
            subscription_tier="featured_partner",
            subscription_status="active",
            owner_email="inez-rentals@example.com",
        ),
        Business(
            name="Harlan Trail Repair Partner",
            slug="harlan-trail-repair-partner",
            category="repairs",
            description="Founding partner repair spot for tires, belts, fluids, and emergency service support near Harlan, Evarts, and Black Mountain.",
            phone="(606) 000-0004",
            location="Harlan, KY",
            photo_url="https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1200&q=80",
            website_url="",
            is_approved=True,
            listing_status="approved",
            is_featured=False,
            subscription_tier="local_business",
            subscription_status="active",
            owner_email="harlan-repair@example.com",
        ),
        Business(
            name="Matewan Fuel & Supply Partner",
            slug="matewan-fuel-supply-partner",
            category="fuel",
            description="Founding partner fuel and supply spot for gas, ice, snacks, straps, gloves, and last-minute rider needs near Matewan and Williamson.",
            phone="(606) 000-0005",
            location="Matewan, WV",
            photo_url="https://images.unsplash.com/photo-1541410965313-d53b3c16ef17?auto=format&fit=crop&w=1200&q=80",
            website_url="",
            is_approved=True,
            listing_status="approved",
            is_featured=False,
            subscription_tier="local_business",
            subscription_status="active",
            owner_email="matewan-fuel@example.com",
        ),
    ]

    for business in businesses:
        business.owner_access_token = secrets.token_urlsafe(24)

    db.add_all(businesses)
    db.flush()
    db.add_all(
        [
            Deal(
                business_id=businesses[1].id,
                title="Founding rider meal deal",
                code="RIDELOCAL",
                description="Use this slot for an opening-weekend meal special or group discount.",
            ),
            Deal(
                business_id=businesses[0].id,
                title="Founding lodging deal",
                code="BASECAMP",
                description="Use this slot for a cabin, campground, or hotel special for rider groups.",
            ),
            Campaign(
                business_id=businesses[1].id,
                title="Hatfield rider meal sponsor",
                description="Featured food placement for riders planning weekends near Hatfield and Rush.",
                target_area="Hatfield / Rush",
                monthly_budget=149,
                status="active",
            ),
        ]
    )
    db.add_all(
        [
            TrailReview(
                area_slug="rush-ky",
                rider_name="Weekend group lead",
                rating=5,
                ride_date="Spring ride",
                machine="UTV",
                difficulty="Moderate",
                trail_condition="Good access roads, easy staging, fuel planning matters.",
                comment="Rush works well as a northeast Kentucky base. We liked being close to Ashland and Grayson for food, supplies, and backup plans.",
                status="approved",
            ),
            TrailReview(
                area_slug="rush-ky",
                rider_name="Family ride planner",
                rating=4,
                ride_date="Weekend trip",
                machine="ATV",
                difficulty="Easy",
                trail_condition="Good for planning, check weather before hauling in.",
                comment="Nice area to stage a low-stress weekend. The key is lining up lodging and fuel before everyone gets there.",
                status="approved",
            ),
            TrailReview(
                area_slug="inez-ky",
                rider_name="Cabin crew",
                rating=5,
                ride_date="Fall weekend",
                machine="Side-by-side",
                difficulty="Moderate",
                trail_condition="Great weekend base with useful nearby towns.",
                comment="Inez is a good anchor when you want the whole trip planned: cabin, food, fuel, and a repair backup just in case.",
                status="approved",
            ),
            TrailReview(
                area_slug="hatfield-ky",
                rider_name="First-time visitor",
                rating=4,
                ride_date="Summer ride",
                machine="Rental UTV",
                difficulty="Easy",
                trail_condition="Simple to plan, good for food and rental needs.",
                comment="Hatfield is a strong pick for new riders because the weekend can stay simple. Food and rental planning are the big wins.",
                status="approved",
            ),
            TrailReview(
                area_slug="matewan-wv",
                rider_name="Day ride crew",
                rating=5,
                ride_date="Saturday ride",
                machine="ATV",
                difficulty="Moderate",
                trail_condition="Historic town stop, bring a fuel and supply plan.",
                comment="Matewan has the trail-town feel riders like. We would build the day around fuel, lunch, and a clear call list.",
                status="approved",
            ),
            TrailReview(
                area_slug="harlan-ky",
                rider_name="Mountain weekend rider",
                rating=5,
                ride_date="Long weekend",
                machine="UTV",
                difficulty="Hard",
                trail_condition="Rugged mountain riding, come prepared.",
                comment="Harlan is where I want the backup plan handled early. Lodging, repairs, and fuel need to be sorted before the big ride days.",
                status="approved",
            ),
            TrailReview(
                area_slug="royal-blue-tn",
                rider_name="Large group organizer",
                rating=4,
                ride_date="Holiday weekend",
                machine="Mixed group",
                difficulty="Moderate",
                trail_condition="Good for groups, planning ahead saves time.",
                comment="Royal Blue and Brimstone are easier when one person has the checklist. Lodging and supply stops should be locked in first.",
                status="approved",
            ),
            TrailReview(
                area_slug="black-mountain-ky",
                rider_name="Experienced rider",
                rating=5,
                ride_date="Fall ride",
                machine="UTV",
                difficulty="Hard",
                trail_condition="Scenic, serious riding with strong prep needs.",
                comment="Black Mountain is worth the trip, but we treat it like a serious weekend. Bring a plan for repairs, weather, and fuel.",
                status="approved",
            ),
        ]
    )
    db.commit()
