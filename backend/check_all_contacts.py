import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.contact import Contact

async def main():
    async with AsyncSessionLocal() as db:
        contacts = (await db.execute(select(Contact))).scalars().all()
        print("=== ALL CONTACTS ===")
        for c in contacts:
            print(f"ID: {c.id} | Name: {c.name} | Phone: {c.phone} | Status: {c.ai_status.value}")

if __name__ == "__main__":
    asyncio.run(main())
