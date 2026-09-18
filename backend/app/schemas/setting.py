from datetime import datetime
from pydantic import BaseModel
from app.models.setting import GlobalAIStatus


class SettingRead(BaseModel):
    id: int
    user_id: int
    personality: str
    default_language: str
    default_tone: str
    global_ai_status: GlobalAIStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SettingUpdate(BaseModel):
    personality: str | None = None
    default_language: str | None = None
    default_tone: str | None = None
    global_ai_status: GlobalAIStatus | None = None
