from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.api.v1.router import api_router
from app.models.user import User
from app.models.contact import Contact, AIStatus
from app.models.message import Message, MessageSender
from app.models.setting import Setting, GlobalAIStatus
from app.models.memory import ConversationMemory
from app.ai.persona import DEFAULT_PERSONA
from app.core.security import get_password_hash


async def seed_initial_demo_data():
    """Seeds default demo user, settings, and contacts (Rakib, Fahim, Sami, Arif) on startup if DB is empty."""
    async with AsyncSessionLocal() as session:
        # 1. Seed default user if missing
        user_res = await session.execute(select(User).limit(1))
        user = user_res.scalar_one_or_none()
        if not user:
            user = User(
                name="Sunfi",
                email="sunfi@example.com",
                password_hash=get_password_hash("password123")
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

            # Add default settings
            user_setting = Setting(
                user_id=user.id,
                personality=DEFAULT_PERSONA,
                default_language="Banglish",
                default_tone="Casual",
                global_ai_status=GlobalAIStatus.ON
            )
            session.add(user_setting)
            await session.commit()

        # 2. Seed initial contacts and 177+ conversation messages from FULL_SEED_DATA
        try:
            from app.core.full_seed_data import FULL_SEED_DATA
            phone_to_contact = {}
            for c in FULL_SEED_DATA.get("contacts", []):
                res = await session.execute(select(Contact).where(Contact.phone == c["phone"]))
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
                    session.add(contact)
                    await session.commit()
                    await session.refresh(contact)

                    mem = ConversationMemory(
                        contact_id=contact.id,
                        summary=f"{contact.name} is a {contact.relationship.lower()} of Sunfi.",
                        important_context=contact.notes
                    )
                    session.add(mem)
                    await session.commit()
                phone_to_contact[c["phone"]] = contact

            # Seed messages
            for m in FULL_SEED_DATA.get("messages", []):
                contact = phone_to_contact.get(m["phone"])
                if not contact:
                    continue
                dup = await session.execute(
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
                session.add(Message(
                    contact_id=contact.id,
                    sender=sender_enum,
                    message=m["message"],
                    message_type=m.get("message_type", "text"),
                    timestamp=dt,
                    whatsapp_message_id=m.get("whatsapp_message_id")
                ))
            await session.commit()
        except Exception as exc:
            import logging
            logging.getLogger(__name__).error(f"Error seeding full data: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables & seed initial data
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_initial_demo_data()
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "title": settings.PROJECT_NAME,
        "status": "online",
        "api_docs": f"{settings.API_V1_STR}/docs",
        "whatsapp_api_version": settings.WHATSAPP_API_VERSION
    }
