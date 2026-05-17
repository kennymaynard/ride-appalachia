from sqlalchemy import inspect, text

from app.database import engine


BUSINESS_COLUMN_MIGRATIONS = {
    "owner_email": "ALTER TABLE businesses ADD COLUMN owner_email VARCHAR(180) DEFAULT ''",
    "owner_access_token": "ALTER TABLE businesses ADD COLUMN owner_access_token VARCHAR(80) DEFAULT ''",
    "listing_status": "ALTER TABLE businesses ADD COLUMN listing_status VARCHAR(40) DEFAULT 'pending'",
    "admin_notes": "ALTER TABLE businesses ADD COLUMN admin_notes TEXT DEFAULT ''",
    "subscription_status": "ALTER TABLE businesses ADD COLUMN subscription_status VARCHAR(40) DEFAULT 'incomplete'",
    "stripe_customer_id": "ALTER TABLE businesses ADD COLUMN stripe_customer_id VARCHAR(180) DEFAULT ''",
    "stripe_subscription_id": "ALTER TABLE businesses ADD COLUMN stripe_subscription_id VARCHAR(180) DEFAULT ''",
}


def run_lightweight_migrations() -> None:
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    if "businesses" not in table_names:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("businesses")}
    with engine.begin() as connection:
        for column_name, statement in BUSINESS_COLUMN_MIGRATIONS.items():
            if column_name not in existing_columns:
                connection.execute(text(statement))

        connection.execute(
            text(
                "UPDATE businesses SET listing_status = 'approved' "
                "WHERE is_approved = true AND (listing_status IS NULL OR listing_status = '' OR listing_status = 'pending')"
            )
        )

        if "campaigns" not in table_names:
            connection.execute(
                text(
                    "CREATE TABLE campaigns ("
                    "id SERIAL PRIMARY KEY, "
                    "business_id INTEGER NOT NULL REFERENCES businesses(id), "
                    "campaign_type VARCHAR(60) DEFAULT 'monthly_sponsor' NOT NULL, "
                    "title VARCHAR(160) NOT NULL, "
                    "description TEXT DEFAULT '' NOT NULL, "
                    "target_area VARCHAR(120) DEFAULT '' NOT NULL, "
                    "monthly_budget INTEGER DEFAULT 149 NOT NULL, "
                    "status VARCHAR(40) DEFAULT 'pending' NOT NULL, "
                    "impressions INTEGER DEFAULT 0 NOT NULL, "
                    "clicks INTEGER DEFAULT 0 NOT NULL, "
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL"
                    ")"
                )
            )

        if "trail_reviews" not in table_names:
            connection.execute(
                text(
                    "CREATE TABLE trail_reviews ("
                    "id SERIAL PRIMARY KEY, "
                    "area_slug VARCHAR(120) NOT NULL, "
                    "rider_name VARCHAR(120) NOT NULL, "
                    "rating INTEGER NOT NULL, "
                    "ride_date VARCHAR(80) DEFAULT '' NOT NULL, "
                    "machine VARCHAR(120) DEFAULT '' NOT NULL, "
                    "difficulty VARCHAR(40) DEFAULT 'Moderate' NOT NULL, "
                    "trail_condition VARCHAR(220) DEFAULT '' NOT NULL, "
                    "comment TEXT NOT NULL, "
                    "status VARCHAR(40) DEFAULT 'pending' NOT NULL, "
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL"
                    ")"
                )
            )
            connection.execute(text("CREATE INDEX ix_trail_reviews_area_slug ON trail_reviews (area_slug)"))
            connection.execute(text("CREATE INDEX ix_trail_reviews_status ON trail_reviews (status)"))

        if "lodging_service_requests" not in table_names:
            connection.execute(
                text(
                    "CREATE TABLE lodging_service_requests ("
                    "id SERIAL PRIMARY KEY, "
                    "business_id INTEGER NOT NULL REFERENCES businesses(id), "
                    "service_type VARCHAR(80) NOT NULL, "
                    "property_name VARCHAR(160) DEFAULT '' NOT NULL, "
                    "property_location VARCHAR(180) DEFAULT '' NOT NULL, "
                    "contact_name VARCHAR(120) DEFAULT '' NOT NULL, "
                    "contact_phone VARCHAR(40) DEFAULT '' NOT NULL, "
                    "contact_email VARCHAR(180) DEFAULT '' NOT NULL, "
                    "date_needed VARCHAR(80) DEFAULT '' NOT NULL, "
                    "notes TEXT DEFAULT '' NOT NULL, "
                    "status VARCHAR(40) DEFAULT 'new' NOT NULL, "
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL"
                    ")"
                )
            )
            connection.execute(text("CREATE INDEX ix_lodging_service_requests_business_id ON lodging_service_requests (business_id)"))
            connection.execute(text("CREATE INDEX ix_lodging_service_requests_status ON lodging_service_requests (status)"))
