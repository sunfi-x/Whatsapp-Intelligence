from datetime import datetime
from pydantic import BaseModel
from app.schemas.contact import ContactRead
from app.schemas.message import MessageRead
from app.schemas.ai_reply import AIReplyRead


class ConversationRead(BaseModel):
    contact: ContactRead
    last_message: MessageRead | None = None
    pending_reply: AIReplyRead | None = None
    total_messages: int = 0
    updated_at: datetime


class ApprovalRequest(BaseModel):
    edited_reply: str | None = None


class ToneRegenerateRequest(BaseModel):
    tone: str = "Casual"  # Casual, Short, Funny, Friendly, Professional, Serious
