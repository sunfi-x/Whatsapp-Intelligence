from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.ai_reply import AIReply
from app.schemas.ai_reply import AIReplyRead, AIReplyUpdate
from app.services import state_machine

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/stop-all")
async def emergency_stop_all(db: AsyncSession = Depends(get_db)):
    """Emergency Stop: Immediately sets AI status to OFF for all contacts."""
    return await state_machine.stop_all_ai(db)


@router.patch("/replies/{reply_id}", response_model=AIReplyRead)
async def update_ai_reply(reply_id: int, update_in: AIReplyUpdate, db: AsyncSession = Depends(get_db)):
    """Updates the edited reply draft before approval."""
    res = await db.execute(select(AIReply).where(AIReply.id == reply_id))
    ai_reply = res.scalar_one_or_none()
    if not ai_reply:
        raise HTTPException(status_code=404, detail="AI reply draft not found")

    ai_reply.edited_reply = update_in.edited_reply
    await db.commit()
    await db.refresh(ai_reply)
    return ai_reply
