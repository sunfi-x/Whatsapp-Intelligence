from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.contact import Contact
from app.schemas.contact import ContactRead, ContactCreate, ContactUpdate
from app.services.memory_service import get_or_create_memory

router = APIRouter(prefix="/contacts", tags=["Contacts"])


@router.get("", response_model=list[ContactRead])
async def list_contacts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Contact).order_by(Contact.updated_at.desc()))
    return list(result.scalars().all())


@router.post("", response_model=ContactRead)
async def create_contact(contact_in: ContactCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Contact).where(Contact.phone == contact_in.phone))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Contact with this phone number already exists")

    contact = Contact(**contact_in.model_dump())
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    await get_or_create_memory(db, contact.id)
    return contact


@router.get("/{contact_id}", response_model=ContactRead)
async def get_contact(contact_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.patch("/{contact_id}", response_model=ContactRead)
async def update_contact(contact_id: int, update_in: ContactUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    update_data = update_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contact, field, value)

    await db.commit()
    await db.refresh(contact)
    return contact
