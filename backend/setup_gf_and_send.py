import asyncio
import json
import sys
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.contact import Contact, AIStatus
from app.services.memory_service import get_or_create_memory
from app.whatsapp.client import whatsapp_client

sys.stdout.reconfigure(encoding='utf-8')

async def setup_and_send_gf():
    phone = "8801781354831"
    name = "Orin"
    
    async with AsyncSessionLocal() as session:
        # 1. Create or update Orin's contact profile
        res = await session.execute(select(Contact).where(Contact.phone == phone))
        contact = res.scalar_one_or_none()
        
        if not contact:
            contact = Contact(
                name=name,
                phone=phone,
                relationship="Girlfriend",
                preferred_language="Banglish",
                preferred_tone="Romantic / Loving",
                notes="Loving girlfriend Orin. Speak with deep warmth, sweetness, affection, and romantic emojis (jan, babu, shona, tumi, 🥰, 😘, ❤️).",
                ai_status=AIStatus.ACTIVE
            )
            session.add(contact)
        else:
            contact.name = name
            contact.relationship = "Girlfriend"
            contact.preferred_language = "Banglish"
            contact.preferred_tone = "Romantic / Loving"
            contact.notes = "Loving girlfriend Orin. Speak with deep warmth, sweetness, affection, and romantic emojis (jan, babu, shona, tumi, 🥰, 😘, ❤️)."
            contact.ai_status = AIStatus.ACTIVE

        await session.commit()
        await session.refresh(contact)
        await get_or_create_memory(session, contact.id)
        print(f"Contact {name} ({phone}) configured successfully as Girlfriend (ACTIVE)!")

    # 2. Send first romantic text via Meta WhatsApp Cloud API
    first_message = "Hey Orin jan! Kemon acho? 😘 Khub miss korchilam tumake! ❤️"
    print(f"Sending first message to Orin: '{first_message}'...")
    whatsapp_res = await whatsapp_client.send_text_message(phone, first_message)
    print("META API RESPONSE:", json.dumps(whatsapp_res, indent=2))

if __name__ == "__main__":
    asyncio.run(setup_and_send_gf())
