from fastapi import APIRouter, HTTPException

from app.schemas import PlannerShareRequest, PlannerShareResponse
from app.services.email_service import send_trip_plan_email
from app.services.sms_service import send_sms

router = APIRouter(tags=["planner"])


def build_trip_plan_sms(destination: str, plan: str) -> str:
    clean_destination = destination.strip() or "your ride"
    clean_plan = plan.strip()
    preview = clean_plan[:1050]
    suffix = "\n\nOpen the emailed plan for full details." if len(clean_plan) > len(preview) else ""
    return (
        f"Appalachia Offroad trip plan for {clean_destination}:\n\n"
        f"{preview}{suffix}\n\n"
        "Verify trail rules before riding. Reply STOP to opt out."
    )


@router.post("/planner/share", response_model=PlannerShareResponse)
def share_trip_plan(payload: PlannerShareRequest) -> PlannerShareResponse:
    email = payload.email.strip()
    phone = payload.phone.strip()
    if not email and not phone:
        raise HTTPException(status_code=400, detail="Enter an email or phone number.")

    email_result = None
    sms_result = None
    if email:
        email_result = send_trip_plan_email(email, payload.destination, payload.plan)
    if phone:
        sms_result = send_sms(phone, build_trip_plan_sms(payload.destination, payload.plan))

    return PlannerShareResponse(
        email_sent=email_result.sent if email_result else False,
        email_message=email_result.message if email_result else "",
        sms_sent=sms_result.sent if sms_result else False,
        sms_message=sms_result.message if sms_result else "",
    )
