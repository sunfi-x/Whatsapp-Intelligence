from datetime import datetime
from pydantic import BaseModel
from app.models.message import MessageSender
from app.schemas.ai_reply import AIReplyRead


class MessageRead(BaseModel):
    id: int
    contact_id: int
    sender: MessageSender
    message: str
    message_type: str
    timestamp: datetime
    whatsapp_message_id: str | None = None
    ai_replies: list[AIReplyRead] = []

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    contact_id: int
    sender: MessageSender
    message: str
    message_type: str = "text"
    whatsapp_message_id: str | None = None
