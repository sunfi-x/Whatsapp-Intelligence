from datetime import datetime
from pydantic import BaseModel


class AnalyticsOverview(BaseModel):
    messages_received: int
    ai_replies_generated: int
    ai_replies_sent: int
    ai_replies_edited: int
    ai_replies_rejected: int
    active_conversations: int
    pending_approvals: int
    off_conversations: int


class HumanEditComparison(BaseModel):
    contact_name: str
    original_ai_reply: str
    human_edited_reply: str
    approved_at: datetime
