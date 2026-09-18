from datetime import datetime, timezone
import enum
from typing import Optional
from sqlalchemy import Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship as ORMRelationship
from app.core.database import Base


class AIReplyStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SENT = "SENT"
    SEND_FAILED = "SEND_FAILED"


class AIReply(Base):
    __tablename__ = "ai_replies"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"), index=True, nullable=False)
    generated_reply: Mapped[str] = mapped_column(Text, nullable=False)
    edited_reply: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[AIReplyStatus] = mapped_column(Enum(AIReplyStatus), default=AIReplyStatus.PENDING, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    message: Mapped["Message"] = ORMRelationship("Message", back_populates="ai_replies")
