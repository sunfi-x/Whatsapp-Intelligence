import logging
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ParsedWhatsAppMessage(BaseModel):
    sender_phone: str
    sender_name: str
    message_text: str
    whatsapp_message_id: str
    timestamp: str | None = None


def parse_whatsapp_webhook_payload(payload: dict) -> list[ParsedWhatsAppMessage]:
    """Parses a Meta WhatsApp Webhook payload and returns structured incoming messages."""
    parsed_messages: list[ParsedWhatsAppMessage] = []
    
    try:
        entries = payload.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                contacts = value.get("contacts", [])
                messages = value.get("messages", [])
                
                # Create profile map from contacts array
                contact_map = {}
                for contact in contacts:
                    wa_id = contact.get("wa_id")
                    profile_name = contact.get("profile", {}).get("name", "Unknown Contact")
                    if wa_id:
                        contact_map[wa_id] = profile_name
                
                for msg in messages:
                    msg_type = msg.get("type")
                    msg_id = msg.get("id", "")
                    from_phone = msg.get("from", "")
                    sender_name = contact_map.get(from_phone, f"Contact ({from_phone})")
                    
                    if msg_type == "text":
                        text_body = msg.get("text", {}).get("body", "").strip()
                        if text_body:
                            parsed_messages.append(
                                ParsedWhatsAppMessage(
                                    sender_phone=from_phone,
                                    sender_name=sender_name,
                                    message_text=text_body,
                                    whatsapp_message_id=msg_id,
                                    timestamp=str(msg.get("timestamp", ""))
                                )
                            )
                    elif msg_type:
                        # Handle non-text messages gracefully
                        parsed_messages.append(
                            ParsedWhatsAppMessage(
                                sender_phone=from_phone,
                                sender_name=sender_name,
                                message_text=f"[{msg_type.upper()} message received]",
                                whatsapp_message_id=msg_id,
                                timestamp=str(msg.get("timestamp", ""))
                            )
                        )
    except Exception as exc:
        logger.error(f"Error parsing WhatsApp webhook payload: {exc}")
        
    return parsed_messages
