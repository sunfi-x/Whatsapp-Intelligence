import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.memory import ConversationMemory
from app.models.message import Message

logger = logging.getLogger(__name__)


async def get_or_create_memory(db: AsyncSession, contact_id: int) -> ConversationMemory:
    """Retrieves or initializes long-term memory for a given contact."""
    result = await db.execute(
        select(ConversationMemory).where(ConversationMemory.contact_id == contact_id)
    )
    memory = result.scalar_one_or_none()
    if not memory:
        memory = ConversationMemory(
            contact_id=contact_id,
            summary="New contact conversation.",
            important_context=""
        )
        db.add(memory)
        await db.commit()
        await db.refresh(memory)
    return memory


async def update_memory_summary(db: AsyncSession, contact_id: int, new_summary: str, important_context: str | None = None):
    """Updates memory summary and important context."""
    memory = await get_or_create_memory(db, contact_id)
    memory.summary = new_summary
    if important_context:
        memory.important_context = important_context
    await db.commit()
    await db.refresh(memory)
    return memory


async def get_recent_messages(db: AsyncSession, contact_id: int, limit: int = 15) -> list[dict]:
    """Retrieves recent conversation messages formatted for prompt builder."""
    result = await db.execute(
        select(Message)
        .where(Message.contact_id == contact_id)
        .order_by(Message.timestamp.desc())
        .limit(limit)
    )
    messages = list(result.scalars().all())
    messages.reverse()
    
    return [
        {
            "id": m.id,
            "sender": m.sender.value,
            "message": m.message,
            "timestamp": m.timestamp.isoformat()
        }
        for m in messages
    ]
