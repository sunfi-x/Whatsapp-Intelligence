from datetime import datetime, timezone
import enum
from typing import Optional, List
from sqlalchemy import String, Text, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship as ORMRelationship
from app.core.database import Base


class AIStatus(str, enum.Enum):
    OFF = "OFF"
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    relationship: Mapped[str] = mapped_column(String(100), default="Unknown")  # Relationship column
    preferred_language: Mapped[str] = mapped_column(String(50), default="Banglish")
    preferred_tone: Mapped[str] = mapped_column(String(50), default="Casual")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_status: Mapped[AIStatus] = mapped_column(Enum(AIStatus), default=AIStatus.OFF, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    messages: Mapped[List["Message"]] = ORMRelationship("Message", back_populates="contact", cascade="all, delete-orphan")
    memory: Mapped[Optional["ConversationMemory"]] = ORMRelationship("ConversationMemory", back_populates="contact", uselist=False, cascade="all, delete-orphan")
