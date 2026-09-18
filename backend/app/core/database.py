import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings


# Create engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# In-memory per-contact mutex lock dictionary for async runtime race condition prevention
_contact_locks: dict[int, asyncio.Lock] = {}
_locks_guard = asyncio.Lock()


async def get_contact_lock(contact_id: int) -> asyncio.Lock:
    """Returns a thread-safe / task-safe Lock for a specific contact_id to prevent race conditions."""
    async with _locks_guard:
        if contact_id not in _contact_locks:
            _contact_locks[contact_id] = asyncio.Lock()
        return _contact_locks[contact_id]
