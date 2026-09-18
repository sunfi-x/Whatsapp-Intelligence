from datetime import datetime
from pydantic import BaseModel
from app.models.contact import AIStatus


class ContactBase(BaseModel):
    name: str
    phone: str
    relationship: str = "Unknown"
    preferred_language: str = "Banglish"
    preferred_tone: str = "Casual"
    notes: str | None = None


class ContactCreate(ContactBase):
    ai_status: AIStatus = AIStatus.OFF


class ContactUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    relationship: str | None = None
    preferred_language: str | None = None
    preferred_tone: str | None = None
    notes: str | None = None
    ai_status: AIStatus | None = None


class ContactRead(ContactBase):
    id: int
    ai_status: AIStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
