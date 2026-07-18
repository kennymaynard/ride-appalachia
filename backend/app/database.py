from collections.abc import Generator
from functools import lru_cache

from pydantic_settings import BaseSettings
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Settings(BaseSettings):
    database_url: str = "sqlite:///./ride_appalachia.db"
    frontend_url: str = "http://localhost:3000"
    stripe_secret_key: str = ""
    stripe_price_local_business: str = ""
    stripe_price_lodging_partner: str = ""
    stripe_price_veteran_owned: str = ""
    stripe_webhook_secret: str = ""
    admin_password: str = "ride-admin"
    resend_api_key: str = ""
    email_from: str = "Appalachia Offroad <support@appalachiaoffroadapp.com>"
    lead_notify_email: str = "support@appalachiaoffroadapp.com"
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_phone: str = ""
    printify_api_token: str = ""
    printify_shop_id: str = ""
    printify_auto_submit_orders: bool = False
    printify_send_shipping_notification: bool = False
    overpass_url: str = "https://overpass-api.de/api/interpreter"
    openai_api_key: str = ""
    openai_trip_model: str = "gpt-5.4-mini"


@lru_cache
def get_settings() -> Settings:
    return Settings()


class Base(DeclarativeBase):
    pass


settings = get_settings()
database_url = settings.database_url
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
engine = create_engine(database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
