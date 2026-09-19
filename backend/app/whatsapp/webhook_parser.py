import logging
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ParsedWhatsAppMessage(BaseModel):
    sender_phone: str
    sender_name: str
    message_text: str
    message_type: str = "text"
    whatsapp_message_id: str
    timestamp: str | None = None
    caption: str | None = None


def parse_whatsapp_webhook_payload(payload: dict) -> list[ParsedWhatsAppMessage]:
    """Parses a Meta WhatsApp Webhook payload and returns structured incoming messages with extracted profile names."""
    parsed_messages: list[ParsedWhatsAppMessage] = []
    
    try:
        entries = payload.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                contacts = value.get("contacts", [])
                messages = value.get("messages", [])
                
                # Create profile map from Meta contacts array (normalizing wa_id)
                contact_map = {}
                for contact in contacts:
                    wa_id = str(contact.get("wa_id", "")).replace("+", "").replace(" ", "").strip()
                    profile_name = contact.get("profile", {}).get("name", "").strip()
                    if wa_id and profile_name:
                        contact_map[wa_id] = profile_name
                
                for msg in messages:
                    msg_type = msg.get("type", "text")
                    msg_id = msg.get("id", "")
                    raw_from = str(msg.get("from", "")).strip()
                    from_phone = raw_from.replace("+", "").replace(" ", "").strip()
                    
                    # Extract real profile name if present in webhook
                    sender_name = contact_map.get(from_phone) or contact_map.get(raw_from) or f"Contact ({from_phone})"
                    
                    if msg_type == "text":
                        text_body = msg.get("text", {}).get("body", "").strip()
                        if text_body:
                            parsed_messages.append(
                                ParsedWhatsAppMessage(
                                    sender_phone=from_phone,
                                    sender_name=sender_name,
                                    message_text=text_body,
                                    message_type="text",
                                    whatsapp_message_id=msg_id,
                                    timestamp=str(msg.get("timestamp", ""))
                                )
                            )
                    elif msg_type == "image":
                        img_obj = msg.get("image", {})
                        caption = img_obj.get("caption", "").strip() if isinstance(img_obj, dict) else ""
                        text_repr = f"📷 [Photo received: {caption}]" if caption else "📷 [Photo received]"
                        parsed_messages.append(
                            ParsedWhatsAppMessage(
                                sender_phone=from_phone,
                                sender_name=sender_name,
                                message_text=text_repr,
                                message_type="image",
                                whatsapp_message_id=msg_id,
                                timestamp=str(msg.get("timestamp", "")),
                                caption=caption
                            )
                        )
                    elif msg_type in ["video", "audio", "voice", "document", "sticker"]:
                        media_obj = msg.get(msg_type, {})
                        caption = media_obj.get("caption", "").strip() if isinstance(media_obj, dict) else ""
                        text_repr = f"[{msg_type.upper()} message received: {caption}]" if caption else f"[{msg_type.upper()} message received]"
                        parsed_messages.append(
                            ParsedWhatsAppMessage(
                                sender_phone=from_phone,
                                sender_name=sender_name,
                                message_text=text_repr,
                                message_type=msg_type,
                                whatsapp_message_id=msg_id,
                                timestamp=str(msg.get("timestamp", "")),
                                caption=caption
                            )
                        )
    except Exception as exc:
        logger.error(f"Error parsing WhatsApp webhook payload: {exc}")
        
    return parsed_messages
