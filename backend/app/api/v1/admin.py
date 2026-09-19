from datetime import datetime, timezone
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.contact import Contact, AIStatus
from app.models.message import Message, MessageSender
from app.models.memory import ConversationMemory

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


class ContactImport(BaseModel):
    name: str
    phone: str
    relationship: Optional[str] = "Unknown"
    preferred_language: Optional[str] = "Banglish"
    preferred_tone: Optional[str] = "Casual"
    notes: Optional[str] = None
    ai_status: Optional[str] = "OFF"


class MessageImport(BaseModel):
    phone: str
    sender: str  # CONTACT, USER, AI
    message: str
    message_type: Optional[str] = "text"
    timestamp: Optional[str] = None
    whatsapp_message_id: Optional[str] = None


class DBImportPayload(BaseModel):
    contacts: List[ContactImport]
    messages: List[MessageImport]


@router.post("/import-db")
async def import_database_snapshot(payload: DBImportPayload, db: AsyncSession = Depends(get_db)):
    """Imports contacts and messages from a local DB backup into the cloud DB."""
    imported_contacts = 0
    imported_messages = 0

    phone_to_contact_id = {}
    for c in payload.contacts:
        res = await db.execute(select(Contact).where(Contact.phone == c.phone))
        contact = res.scalar_one_or_none()
        status_enum = AIStatus.ACTIVE if c.ai_status == "ACTIVE" else (AIStatus.PENDING if c.ai_status == "PENDING" else AIStatus.OFF)

        if not contact:
            contact = Contact(
                name=c.name,
                phone=c.phone,
                relationship=c.relationship or "Unknown",
                preferred_language=c.preferred_language or "Banglish",
                preferred_tone=c.preferred_tone or "Casual",
                notes=c.notes,
                ai_status=status_enum
            )
            db.add(contact)
            await db.commit()
            await db.refresh(contact)
            
            mem = ConversationMemory(
                contact_id=contact.id,
                summary=f"{contact.name} is a {contact.relationship.lower()} of Sunfi.",
                important_context=contact.notes
            )
            db.add(mem)
            await db.commit()
            imported_contacts += 1
        else:
            if c.ai_status == "ACTIVE" and contact.ai_status != AIStatus.ACTIVE:
                contact.ai_status = AIStatus.ACTIVE
                await db.commit()

        phone_to_contact_id[c.phone] = contact.id

    for m in payload.messages:
        contact_id = phone_to_contact_id.get(m.phone)
        if not contact_id:
            res = await db.execute(select(Contact).where(Contact.phone == m.phone))
            c_obj = res.scalar_one_or_none()
            if c_obj:
                contact_id = c_obj.id
                phone_to_contact_id[m.phone] = contact_id

        if not contact_id:
            continue

        dup_check = await db.execute(
            select(Message)
            .where(Message.contact_id == contact_id)
            .where(Message.message == m.message)
        )
        if dup_check.scalar_one_or_none():
            continue

        sender_enum = MessageSender.AI if m.sender == "AI" else (MessageSender.USER if m.sender == "USER" else MessageSender.CONTACT)
        
        dt = datetime.now(timezone.utc)
        if m.timestamp:
            try:
                dt = datetime.fromisoformat(m.timestamp)
            except Exception:
                pass

        msg_obj = Message(
            contact_id=contact_id,
            sender=sender_enum,
            message=m.message,
            message_type=m.message_type or "text",
            timestamp=dt,
            whatsapp_message_id=m.whatsapp_message_id
        )
        db.add(msg_obj)
        imported_messages += 1

    await db.commit()

    return {
        "status": "success",
        "imported_contacts": imported_contacts,
        "imported_messages": imported_messages
    }


@router.post("/sync-system-data")
async def sync_system_data_endpoint(db: AsyncSession = Depends(get_db)):
    """Triggers seed restoration of all 177+ messages and contacts directly from FULL_SEED_DATA."""
    try:
        from app.core.full_seed_data import FULL_SEED_DATA
        imported_contacts = 0
        imported_messages = 0

        phone_to_contact = {}
        for c in FULL_SEED_DATA.get("contacts", []):
            res = await db.execute(select(Contact).where(Contact.phone == c["phone"]))
            contact = res.scalar_one_or_none()
            status_enum = AIStatus.ACTIVE if c.get("ai_status") == "ACTIVE" else (AIStatus.PENDING if c.get("ai_status") == "PENDING" else AIStatus.OFF)
            if not contact:
                contact = Contact(
                    name=c["name"],
                    phone=c["phone"],
                    relationship=c.get("relationship", "Unknown"),
                    preferred_language=c.get("preferred_language", "Banglish"),
                    preferred_tone=c.get("preferred_tone", "Casual"),
                    notes=c.get("notes"),
                    ai_status=status_enum
                )
                db.add(contact)
                await db.commit()
                await db.refresh(contact)

                mem = ConversationMemory(
                    contact_id=contact.id,
                    summary=f"{contact.name} is a {contact.relationship.lower()} of Sunfi.",
                    important_context=contact.notes
                )
                session_mem = mem
                db.add(session_mem)
                await db.commit()
                imported_contacts += 1
            phone_to_contact[c["phone"]] = contact

        for m in FULL_SEED_DATA.get("messages", []):
            contact = phone_to_contact.get(m["phone"])
            if not contact:
                continue
            dup = await db.execute(
                select(Message).where(Message.contact_id == contact.id).where(Message.message == m["message"])
            )
            if dup.scalar_one_or_none():
                continue
            sender_enum = MessageSender.AI if m["sender"] == "AI" else (MessageSender.USER if m["sender"] == "USER" else MessageSender.CONTACT)
            dt = datetime.now(timezone.utc)
            if m.get("timestamp"):
                try:
                    dt = datetime.fromisoformat(m["timestamp"])
                except Exception:
                    pass
            db.add(Message(
                contact_id=contact.id,
                sender=sender_enum,
                message=m["message"],
                message_type=m.get("message_type", "text"),
                timestamp=dt,
                whatsapp_message_id=m.get("whatsapp_message_id")
            ))
            imported_messages += 1

        await db.commit()
        return {"status": "success", "imported_contacts": imported_contacts, "imported_messages": imported_messages}
    except Exception as exc:
        logger.error(f"Error syncing system data: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
