from datetime import datetime, timezone
import enum
from typing import Optional, List
from sqlalchemy import String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship as ORMRelationship
from app.core.database import Base


class MessageSender(str, enum.Enum):
    CONTACT = "CONTACT"
    USER = "USER"
    AI = "AI"


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    contact_id: Mapped[int] = mapped_column(ForeignKey("contacts.id", ondelete="CASCADE"), index=True, nullable=False)
    sender: Mapped[MessageSender] = mapped_column(Enum(MessageSender), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[str] = mapped_column(String(50), default="text")
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    whatsapp_message_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True, nullable=True)

    contact: Mapped["Contact"] = ORMRelationship("Contact", back_populates="messages")
    ai_replies: Mapped[List["AIReply"]] = ORMRelationship("AIReply", back_populates="message", cascade="all, delete-orphan", lazy="selectin")
