import asyncio
import sys
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.contact import Contact
from app.models.message import Message
from app.models.ai_reply import AIReply

async def main():
    async with AsyncSessionLocal() as db:
        contacts = (await db.execute(select(Contact))).scalars().all()
        print("=== CONTACTS IN DB ===")
        for c in contacts:
            print(f"ID: {c.id} | Name: {c.name} | Phone: {c.phone} | Status: {c.ai_status.value} | UpdatedAt: {c.updated_at}")
        
        messages = (await db.execute(select(Message).order_by(Message.id.desc()).limit(15))).scalars().all()
        print("\n=== LAST 15 MESSAGES ===")
        for m in messages:
            safe_text = m.message.encode('ascii', errors='replace').decode('ascii')
            print(f"ID: {m.id} | ContactID: {m.contact_id} | Sender: {m.sender.value} | Text: {safe_text} | Time: {m.timestamp}")

        ai_replies = (await db.execute(select(AIReply).order_by(AIReply.id.desc()).limit(10))).scalars().all()
        print("\n=== LAST 10 AI REPLIES ===")
        for r in ai_replies:
            safe_reply = r.generated_reply.encode('ascii', errors='replace').decode('ascii')
            print(f"ID: {r.id} | MsgID: {r.message_id} | Status: {r.status.value} | Reply: {safe_reply}")

if __name__ == "__main__":
    asyncio.run(main())
