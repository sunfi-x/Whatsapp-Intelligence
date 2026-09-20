import re
import io
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.core.database import get_db
from app.models.contact import Contact, AIStatus
from app.models.message import Message, MessageSender
from app.models.ai_reply import AIReply, AIReplyStatus
from app.schemas.conversation import ConversationRead, ApprovalRequest, ToneRegenerateRequest
from app.schemas.message import MessageRead
from app.schemas.ai_reply import AIReplyRead
from app.schemas.contact import ContactRead
from app.services import state_machine
from app.whatsapp.client import whatsapp_client

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("", response_model=list[ConversationRead])
async def list_conversations(status_filter: str | None = None, db: AsyncSession = Depends(get_db)):
    """Lists conversations with last activity, filterable by status (active, pending, off)."""
    query = select(Contact)
    if status_filter:
        filter_upper = status_filter.upper()
        if filter_upper in ["ACTIVE", "PENDING", "OFF"]:
            query = query.where(Contact.ai_status == AIStatus(filter_upper))

    query = query.order_by(Contact.updated_at.desc())
    res = await db.execute(query)
    contacts = list(res.scalars().all())

    conversations = []
    for contact in contacts:
        # Fetch last message
        last_msg_res = await db.execute(
            select(Message)
            .options(selectinload(Message.ai_replies))
            .where(Message.contact_id == contact.id)
            .order_by(Message.timestamp.desc())
            .limit(1)
        )
        last_msg = last_msg_res.scalars().first()

        # Fetch pending reply if exists
        pending_reply_res = await db.execute(
            select(AIReply)
            .join(Message)
            .where(Message.contact_id == contact.id)
            .where(AIReply.status.in_([AIReplyStatus.PENDING, AIReplyStatus.SEND_FAILED]))
            .order_by(AIReply.created_at.desc())
            .limit(1)
        )
        pending_reply = pending_reply_res.scalars().first()

        # Total messages count
        count_res = await db.execute(
            select(func.count(Message.id)).where(Message.contact_id == contact.id)
        )
        total_msgs = count_res.scalar() or 0

        conversations.append(
            ConversationRead(
                contact=ContactRead.model_validate(contact),
                last_message=MessageRead.model_validate(last_msg) if last_msg else None,
                pending_reply=AIReplyRead.model_validate(pending_reply) if pending_reply else None,
                total_messages=total_msgs,
                updated_at=contact.updated_at
            )
        )

    return conversations


@router.get("/pending", response_model=list[ConversationRead])
async def list_pending_conversations(db: AsyncSession = Depends(get_db)):
    """Shortcut endpoint listing pending approval conversations."""
    return await list_conversations(status_filter="pending", db=db)


@router.get("/{contact_id}")
async def get_conversation_details(contact_id: int, db: AsyncSession = Depends(get_db)):
    """Retrieves conversation thread messages and contact info."""
    c_res = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = c_res.scalars().first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    msgs_res = await db.execute(
        select(Message)
        .options(selectinload(Message.ai_replies))
        .where(Message.contact_id == contact_id)
        .order_by(Message.timestamp.asc())
    )
    messages = list(msgs_res.scalars().all())

    # Find active pending reply
    pending_reply_res = await db.execute(
        select(AIReply)
        .join(Message)
        .where(Message.contact_id == contact_id)
        .where(AIReply.status.in_([AIReplyStatus.PENDING, AIReplyStatus.SEND_FAILED]))
        .order_by(AIReply.created_at.desc())
        .limit(1)
    )
    pending_reply = pending_reply_res.scalars().first()

    return {
        "contact": ContactRead.model_validate(contact),
        "messages": [MessageRead.model_validate(m) for m in messages],
        "pending_reply": AIReplyRead.model_validate(pending_reply) if pending_reply else None
    }


@router.post("/{contact_id}/approve")
async def approve_conversation(contact_id: int, request: ApprovalRequest = None, db: AsyncSession = Depends(get_db)):
    """Approves pending draft, sets AI status to ACTIVE, and dispatches message to WhatsApp."""
    try:
        edited_text = request.edited_reply if request else None
        result = await state_machine.approve_and_start_ai(db, contact_id, edited_reply=edited_text)
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/{contact_id}/reject")
async def reject_conversation(contact_id: int, db: AsyncSession = Depends(get_db)):
    """Rejects pending AI draft."""
    return await state_machine.reject_pending_reply(db, contact_id)


@router.post("/{contact_id}/turn-off")
async def turn_off_conversation(contact_id: int, db: AsyncSession = Depends(get_db)):
    """Immediately turns OFF AI for this contact."""
    return await state_machine.turn_off_ai(db, contact_id)


@router.post("/{contact_id}/regenerate")
async def regenerate_conversation(contact_id: int, request: ToneRegenerateRequest = None, db: AsyncSession = Depends(get_db)):
    """Regenerates pending suggestion with optional tone override."""
    tone = request.tone if request else "Casual"
    return await state_machine.regenerate_pending_reply(db, contact_id, tone_override=tone)


@router.post("/{contact_id}/send")
async def send_manual_message(contact_id: int, message_body: dict, db: AsyncSession = Depends(get_db)):
    """Allows the human user to send a manual reply directly via WhatsApp."""
    text = message_body.get("message", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message text is required")

    c_res = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = c_res.scalars().first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Send via WhatsApp API (with fallback if token/network fails)
    try:
        whatsapp_res = await whatsapp_client.send_text_message(contact.phone, text)
    except Exception as exc:
        logger.warning(f"WhatsApp API error on manual message send (falling back to simulated dispatch): {exc}")
        whatsapp_res = {"status": "simulated_sent", "note": str(exc), "mock": True}

    try:
        # Save message with sender = USER
        user_msg = Message(
            contact_id=contact.id,
            sender=MessageSender.USER,
            message=text,
            message_type="text",
            timestamp=datetime.now(timezone.utc)
        )
        db.add(user_msg)
        contact.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(user_msg)

        return {"status": "manual_sent", "message": MessageRead.model_validate(user_msg), "whatsapp_response": whatsapp_res}
    except Exception as exc:
        logger.error(f"Failed to save manual message: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to process manual message: {str(exc)}")


@router.get("/{contact_id}/media/{message_id}")
async def get_message_media(contact_id: int, message_id: int, db: AsyncSession = Depends(get_db)):
    """Proxy: fetches WhatsApp media bytes from Meta CDN and streams to frontend.
    Requires media_id encoded in message text as 'MEDIA_ID:xxxxx'.
    """
    msg_res = await db.execute(
        select(Message).where(Message.id == message_id, Message.contact_id == contact_id)
    )
    msg = msg_res.scalars().first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    media_id_match = re.search(r"MEDIA_ID:(\S+)", msg.message or "")
    if not media_id_match:
        raise HTTPException(status_code=404, detail="No media_id in message")

    media_id = media_id_match.group(1)

    try:
        meta_data = await whatsapp_client.get_media_url(media_id)
        media_url = meta_data.get("url")
        if not media_url:
            raise HTTPException(status_code=503, detail="Media URL unavailable (mock mode or API not configured)")

        mime_type = meta_data.get("mime_type", "image/jpeg")
        image_bytes = await whatsapp_client.download_media_bytes(media_url)

        return StreamingResponse(
            io.BytesIO(image_bytes),
            media_type=mime_type,
            headers={"Cache-Control": "private, max-age=3600"}
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Media proxy error for message {message_id}: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch media: {str(exc)}")
