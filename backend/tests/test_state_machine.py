import pytest
from sqlalchemy import select
from app.models.contact import Contact, AIStatus
from app.models.message import Message, MessageSender
from app.models.ai_reply import AIReply, AIReplyStatus
from app.models.setting import Setting, GlobalAIStatus
from app.services import state_machine
from app.whatsapp.client import whatsapp_client


@pytest.mark.asyncio
async def test_off_contact_receives_message_transitions_to_pending(db_session):
    """Test 1: Incoming message to OFF contact stores msg, generates AI draft, sets status PENDING, sends 0 WhatsApp messages."""
    whatsapp_client.sent_payloads.clear()
    phone = "8801711111111"
    
    res = await state_machine.process_incoming_message(
        db=db_session,
        sender_phone=phone,
        sender_name="Rakib Test",
        message_text="bro ki obostha?",
        whatsapp_message_id="wamid.test_01"
    )
    
    assert res["status"] == "draft_created_pending"
    
    # Verify contact status is PENDING
    c_res = await db_session.execute(select(Contact).where(Contact.phone == phone))
    contact = c_res.scalar_one()
    assert contact.ai_status == AIStatus.PENDING

    # Verify AI draft was created with status PENDING
    r_res = await db_session.execute(
        select(AIReply)
        .join(Message)
        .where(Message.contact_id == contact.id)
    )
    reply = r_res.scalar_one()
    assert reply.status == AIReplyStatus.PENDING
    assert reply.generated_reply != ""

    # Verify 0 WhatsApp messages sent
    assert len(whatsapp_client.sent_payloads) == 0


@pytest.mark.asyncio
async def test_pending_contact_receives_another_message(db_session):
    """Test 2: PENDING contact receives another message -> draft updated, remains PENDING, 0 WhatsApp messages sent."""
    whatsapp_client.sent_payloads.clear()
    phone = "8801711111111"
    
    # Setup initial pending state
    await state_machine.process_incoming_message(
        db=db_session,
        sender_phone=phone,
        sender_name="Rakib Test",
        message_text="bro ki obostha?",
        whatsapp_message_id="wamid.test_01"
    )
    
    # Second message
    res = await state_machine.process_incoming_message(
        db=db_session,
        sender_phone=phone,
        sender_name="Rakib Test",
        message_text="bro reply des na keno?",
        whatsapp_message_id="wamid.test_02"
    )
    
    assert res["status"] == "draft_created_pending"
    
    c_res = await db_session.execute(select(Contact).where(Contact.phone == phone))
    contact = c_res.scalar_one()
    assert contact.ai_status == AIStatus.PENDING
    assert len(whatsapp_client.sent_payloads) == 0


@pytest.mark.asyncio
async def test_user_approves_and_starts_ai_success(db_session):
    """Test 3: User approves pending draft -> WhatsApp sent, status ACTIVE, ai_reply status SENT."""
    whatsapp_client.sent_payloads.clear()
    phone = "8801711111111"
    
    # First create pending message
    await state_machine.process_incoming_message(
        db=db_session,
        sender_phone=phone,
        sender_name="Rakib Test",
        message_text="bro ki obostha?",
        whatsapp_message_id="wamid.test_01"
    )
    
    c_res = await db_session.execute(select(Contact).where(Contact.phone == phone))
    contact = c_res.scalar_one()

    result = await state_machine.approve_and_start_ai(
        db=db_session,
        contact_id=contact.id,
        edited_reply="bhalo achi bro 😭 tor?"
    )

    assert result["status"] == "approved_and_activated"
    assert result["ai_status"] == "ACTIVE"
    
    # Verify contact is ACTIVE
    await db_session.refresh(contact)
    assert contact.ai_status == AIStatus.ACTIVE

    # Verify WhatsApp message payload was sent
    assert len(whatsapp_client.sent_payloads) == 1
    assert whatsapp_client.sent_payloads[0]["text"]["body"] == "bhalo achi bro 😭 tor?"


@pytest.mark.asyncio
async def test_active_contact_receives_message_auto_sends(db_session):
    """Test 4: ACTIVE contact receives message -> AI auto-generates & auto-sends reply without approval prompt."""
    whatsapp_client.sent_payloads.clear()
    phone = "8801711111111"

    # Setup active contact directly
    contact = Contact(name="Rakib Test", phone=phone, ai_status=AIStatus.ACTIVE)
    db_session.add(contact)
    await db_session.commit()
    
    res = await state_machine.process_incoming_message(
        db=db_session,
        sender_phone=phone,
        sender_name="Rakib Test",
        message_text="kal campus e ashbi?",
        whatsapp_message_id="wamid.test_03"
    )
    
    assert res["status"] == "auto_sent"
    assert len(whatsapp_client.sent_payloads) == 1


@pytest.mark.asyncio
async def test_user_turns_off_ai(db_session):
    """Test 5: User turns OFF AI -> Contact becomes OFF. Next message creates draft & PENDING status without sending."""
    whatsapp_client.sent_payloads.clear()
    phone = "8801711111111"
    
    contact = Contact(name="Rakib Test", phone=phone, ai_status=AIStatus.ACTIVE)
    db_session.add(contact)
    await db_session.commit()

    # Turn off AI
    off_res = await state_machine.turn_off_ai(db_session, contact.id)
    assert off_res["ai_status"] == "OFF"

    # Send new message while OFF
    res = await state_machine.process_incoming_message(
        db=db_session,
        sender_phone=phone,
        sender_name="Rakib Test",
        message_text="bro koi?",
        whatsapp_message_id="wamid.test_04"
    )
    
    # Spec Correction 1 & 2: OFF + message -> transitions to PENDING draft, does NOT auto-send!
    assert res["status"] == "draft_created_pending"
    assert len(whatsapp_client.sent_payloads) == 0


@pytest.mark.asyncio
async def test_global_ai_off_prevents_auto_send(db_session):
    """Test 6: Global AI OFF overrides active contact, preventing auto-send."""
    whatsapp_client.sent_payloads.clear()
    phone = "8801722222222"
    
    # Create active contact
    contact = Contact(name="Fahim Test", phone=phone, ai_status=AIStatus.ACTIVE)
    db_session.add(contact)
    await db_session.commit()

    # Set Global AI status to OFF
    setting_res = await db_session.execute(select(Setting).limit(1))
    setting = setting_res.scalar_one_or_none()
    if setting:
        setting.global_ai_status = GlobalAIStatus.OFF
        await db_session.commit()

    res = await state_machine.process_incoming_message(
        db=db_session,
        sender_phone=phone,
        sender_name="Fahim Test",
        message_text="assignments submit korsos?",
        whatsapp_message_id="wamid.test_05"
    )
    
    assert res["status"] == "draft_created_pending"
    assert len(whatsapp_client.sent_payloads) == 0


@pytest.mark.asyncio
async def test_message_deduplication(db_session):
    """Test 7: Duplicate WhatsApp message ID payload is safely ignored."""
    phone = "8801733333333"
    
    res1 = await state_machine.process_incoming_message(
        db=db_session,
        sender_phone=phone,
        sender_name="Sami Test",
        message_text="hello bro",
        whatsapp_message_id="wamid.unique_999"
    )
    assert res1["status"] in ["draft_created_pending", "auto_sent"]

    # Send duplicate
    res2 = await state_machine.process_incoming_message(
        db=db_session,
        sender_phone=phone,
        sender_name="Sami Test",
        message_text="hello bro",
        whatsapp_message_id="wamid.unique_999"
    )
    assert res2["status"] == "duplicate_ignored"


@pytest.mark.asyncio
async def test_emergency_stop_all(db_session):
    """Test 8: Emergency Stop All updates all contacts to OFF."""
    c1 = Contact(name="C1", phone="111", ai_status=AIStatus.ACTIVE)
    c2 = Contact(name="C2", phone="222", ai_status=AIStatus.ACTIVE)
    db_session.add_all([c1, c2])
    await db_session.commit()

    res = await state_machine.stop_all_ai(db_session)
    assert res["status"] == "stop_all_success"

    c_res = await db_session.execute(select(Contact))
    contacts = list(c_res.scalars().all())
    for c in contacts:
        assert c.ai_status == AIStatus.OFF
