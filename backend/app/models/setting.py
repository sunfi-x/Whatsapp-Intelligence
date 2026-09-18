from datetime import datetime, timezone
import enum
from typing import Optional
from sqlalchemy import String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship as ORMRelationship
from app.core.database import Base


class GlobalAIStatus(str, enum.Enum):
    ON = "ON"
    OFF = "OFF"


class Setting(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    personality: Mapped[str] = mapped_column(Text, nullable=False)
    default_language: Mapped[str] = mapped_column(String(50), default="Banglish")
    default_tone: Mapped[str] = mapped_column(String(50), default="Casual")
    global_ai_status: Mapped[GlobalAIStatus] = mapped_column(Enum(GlobalAIStatus), default=GlobalAIStatus.ON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user: Mapped["User"] = ORMRelationship("User", back_populates="settings")
