from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.contact import Contact, AIStatus
from app.models.message import Message, MessageSender
from app.models.ai_reply import AIReply, AIReplyStatus
from app.schemas.analytics import AnalyticsOverview, HumanEditComparison


async def get_analytics_overview(db: AsyncSession) -> AnalyticsOverview:
    """Calculates real-time system metrics."""
    # Total Messages in system
    res_total = await db.execute(select(func.count(Message.id)))
    total_messages = res_total.scalar() or 0

    # Incoming contact messages
    res_rx = await db.execute(select(func.count(Message.id)).where(Message.sender == MessageSender.CONTACT))
    messages_received = res_rx.scalar() or 0

    # Total AI replies sent (count MessageSender.AI OR AIReplyStatus.SENT)
    res_sent_msg = await db.execute(select(func.count(Message.id)).where(Message.sender == MessageSender.AI))
    ai_msg_sent = res_sent_msg.scalar() or 0

    res_sent_reply = await db.execute(select(func.count(AIReply.id)).where(AIReply.status == AIReplyStatus.SENT))
    ai_reply_sent = res_sent_reply.scalar() or 0

    ai_replies_sent = max(ai_msg_sent, ai_reply_sent)

    # Total AI replies generated
    res_gen = await db.execute(select(func.count(AIReply.id)))
    ai_replies_generated = max(res_gen.scalar() or 0, ai_replies_sent)

    # AI replies edited
    res_edited = await db.execute(
        select(func.count(AIReply.id)).where(AIReply.edited_reply.isnot(None)).where(AIReply.edited_reply != "")
    )
    ai_replies_edited = res_edited.scalar() or 0

    # AI replies rejected
    res_rej = await db.execute(select(func.count(AIReply.id)).where(AIReply.status == AIReplyStatus.REJECTED))
    ai_replies_rejected = res_rej.scalar() or 0

    # Contact status counts
    res_act = await db.execute(select(func.count(Contact.id)).where(Contact.ai_status == AIStatus.ACTIVE))
    active_conversations = res_act.scalar() or 0

    res_pend = await db.execute(select(func.count(Contact.id)).where(Contact.ai_status == AIStatus.PENDING))
    pending_approvals = res_pend.scalar() or 0

    res_off = await db.execute(select(func.count(Contact.id)).where(Contact.ai_status == AIStatus.OFF))
    off_conversations = res_off.scalar() or 0

    return AnalyticsOverview(
        messages_received=total_messages if total_messages > 0 else messages_received,
        ai_replies_generated=ai_replies_generated,
        ai_replies_sent=ai_replies_sent,
        ai_replies_edited=ai_replies_edited,
        ai_replies_rejected=ai_replies_rejected,
        active_conversations=active_conversations,
        pending_approvals=pending_approvals,
        off_conversations=off_conversations
    )


async def get_human_edit_learning_data(db: AsyncSession, limit: int = 20) -> list[HumanEditComparison]:
    """Retrieves pairs of AI Generated vs Human Edited replies for prompt refinement analysis."""
    result = await db.execute(
        select(AIReply, Message, Contact)
        .join(Message, AIReply.message_id == Message.id)
        .join(Contact, Message.contact_id == Contact.id)
        .where(AIReply.edited_reply.isnot(None))
        .where(AIReply.edited_reply != "")
        .order_by(AIReply.created_at.desc())
        .limit(limit)
    )
    
    items = []
    for reply, msg, contact in result.all():
        items.append(
            HumanEditComparison(
                contact_name=contact.name,
                original_ai_reply=reply.generated_reply,
                human_edited_reply=reply.edited_reply or "",
                approved_at=reply.approved_at or reply.created_at
            )
        )
    return items
