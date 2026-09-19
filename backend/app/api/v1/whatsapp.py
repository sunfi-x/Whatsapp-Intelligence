import logging
from fastapi import APIRouter, Depends, Query, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.whatsapp.webhook_parser import parse_whatsapp_webhook_payload
from app.services import state_machine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


@router.get("/webhook")
async def verify_whatsapp_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
):
    """Meta WhatsApp Cloud API Webhook Verification Endpoint."""
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        logger.info("WhatsApp webhook verified successfully!")
        return Response(content=hub_challenge, media_type="text/plain")
    logger.warning("WhatsApp webhook verification failed. Token mismatch.")
    raise HTTPException(status_code=403, detail="Verification token mismatch")


@router.post("/webhook")
async def handle_whatsapp_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Meta WhatsApp Cloud API Webhook Payload Ingestion Endpoint."""
    try:
        payload = await request.json()
        logger.info(f"Incoming WhatsApp Webhook Payload: {payload}")
        
        parsed_msgs = parse_whatsapp_webhook_payload(payload)
        results = []
        for msg in parsed_msgs:
            res = await state_machine.process_incoming_message(
                db=db,
                sender_phone=msg.sender_phone,
                sender_name=msg.sender_name,
                message_text=msg.message_text,
                message_type=msg.message_type,
                whatsapp_message_id=msg.whatsapp_message_id
            )
            results.append(res)

        return {"status": "success", "processed_count": len(parsed_msgs), "results": results}
    except Exception as exc:
        logger.error(f"Error handling WhatsApp webhook: {exc}")
        return {"status": "error", "message": str(exc)}


class SimulateMessageRequest(BaseModel):
    sender_phone: str = "8801700000001"
    sender_name: str = "Rakib"
    message_text: str = "bro ki obostha?"


import time

@router.post("/simulate-incoming")
async def simulate_incoming_whatsapp_message(
    req: SimulateMessageRequest,
    db: AsyncSession = Depends(get_db)
):
    """Webhook Simulator: Runs simulated incoming messages through the exact same state machine pipeline."""
    unique_id = f"wamid.simulated_{req.sender_phone}_{int(time.time() * 1000)}"
    res = await state_machine.process_incoming_message(
        db=db,
        sender_phone=req.sender_phone,
        sender_name=req.sender_name,
        message_text=req.message_text,
        whatsapp_message_id=unique_id
    )
    return res
