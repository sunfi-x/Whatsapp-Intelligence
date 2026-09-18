from datetime import datetime
from pydantic import BaseModel
from app.models.ai_reply import AIReplyStatus


class AIReplyRead(BaseModel):
    id: int
    message_id: int
    generated_reply: str
    edited_reply: str | None = None
    status: AIReplyStatus
    created_at: datetime
    approved_at: datetime | None = None
    sent_at: datetime | None = None

    class Config:
        from_attributes = True


class AIReplyUpdate(BaseModel):
    edited_reply: str
