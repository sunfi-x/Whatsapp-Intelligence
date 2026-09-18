from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.api.v1.router import api_router
from app.models.user import User
from app.models.contact import Contact, AIStatus
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

        # 2. Seed initial demo contacts if missing
        contacts_res = await session.execute(select(Contact).limit(1))
        if not contacts_res.scalar_one_or_none():
            demo_contacts = [
                Contact(name="Rakib", phone="8801700000001", relationship="Friend", preferred_language="Banglish", preferred_tone="Casual", ai_status=AIStatus.OFF, notes="University classmate & close friend. Discusses campus, football, classes."),
                Contact(name="Fahim", phone="8801700000002", relationship="Classmate", preferred_language="Banglish", preferred_tone="Casual", ai_status=AIStatus.OFF, notes="Group project partner."),
                Contact(name="Sami", phone="8801700000003", relationship="Friend", preferred_language="Banglish", preferred_tone="Funny", ai_status=AIStatus.OFF, notes="Gaming buddy."),
                Contact(name="Arif", phone="8801700000004", relationship="Professional", preferred_language="English", preferred_tone="Professional", ai_status=AIStatus.OFF, notes="Software Lead."),
            ]
            for c in demo_contacts:
                session.add(c)
                await session.commit()
                await session.refresh(c)
                
                # Create initial memory
                mem = ConversationMemory(
                    contact_id=c.id,
                    summary=f"{c.name} is a {c.relationship.lower()} of Sunfi.",
                    important_context=c.notes
                )
                session.add(mem)
                await session.commit()


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
    allow_origins=["*"],  # Allow all for development flexibility
    allow_credentials=True,
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
