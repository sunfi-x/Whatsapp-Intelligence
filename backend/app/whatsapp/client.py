import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


class WhatsAppClient:
    """WhatsApp Cloud API Client with configurable Graph API version support."""
    
    def __init__(
        self,
        access_token: str | None = None,
        phone_number_id: str | None = None,
        api_version: str | None = None,
        mock_mode: bool = False
    ):
        self.access_token = access_token or settings.WHATSAPP_ACCESS_TOKEN
        self.phone_number_id = phone_number_id or settings.WHATSAPP_PHONE_NUMBER_ID
        self.api_version = api_version or settings.WHATSAPP_API_VERSION
        
        # Real Meta Cloud API tokens always start with 'EAA' (e.g. EAAG..., EAAX...)
        is_invalid_or_placeholder = (
            not self.access_token 
            or self.access_token.startswith("placeholder")
            or not self.access_token.startswith("EAA")
        )
        self.mock_mode = mock_mode or is_invalid_or_placeholder
        self.sent_payloads: list[dict] = []  # In-memory record for testing & simulation

    @property
    def base_url(self) -> str:
        return f"https://graph.facebook.com/{self.api_version}/{self.phone_number_id}"

    async def send_text_message(self, recipient_phone: str, text_body: str) -> dict:
        """Sends a text message to recipient_phone via WhatsApp Cloud API or Mock mode."""
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient_phone.replace("+", "").replace(" ", "").strip(),
            "type": "text",
            "text": {"preview_url": False, "body": text_body},
        }

        self.sent_payloads.append(payload)

        if self.mock_mode:
            logger.info(f"[WhatsApp Simulator/Mock Client] Sending message to {recipient_phone}: {text_body}")
            return {
                "messaging_product": "whatsapp",
                "contacts": [{"input": recipient_phone, "wa_id": recipient_phone}],
                "messages": [{"id": f"wamid.mock_{len(self.sent_payloads)}"}],
                "status": "success",
                "mock": True
            }

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/messages",
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()
                logger.info(f"WhatsApp Cloud API message sent to {recipient_phone}: {data}")
                return data
            except httpx.HTTPStatusError as exc:
                logger.error(f"WhatsApp API HTTP Error: {exc.response.status_code} - {exc.response.text}")
                raise RuntimeError(f"WhatsApp API call failed: {exc.response.text}") from exc
            except Exception as exc:
                logger.error(f"WhatsApp API connection error: {str(exc)}")
                raise RuntimeError(f"WhatsApp API network error: {str(exc)}") from exc
    async def get_media_url(self, media_id: str) -> dict:
        """Fetches the temporary download URL for a WhatsApp media object by its media_id.
        Returns dict with 'url', 'mime_type', 'file_size', 'id'.
        """
        if self.mock_mode:
            logger.info(f"[Mock] get_media_url called for media_id={media_id}")
            return {"url": None, "mime_type": "image/jpeg", "id": media_id, "mock": True}

        headers = {"Authorization": f"Bearer {self.access_token}"}
        graph_url = f"https://graph.facebook.com/{self.api_version}/{media_id}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.get(graph_url, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                logger.info(f"Media metadata fetched for {media_id}: {data.get('mime_type')} {data.get('file_size')} bytes")
                return data  # contains .url (temporary CDN URL), .mime_type, .file_size, .id
            except httpx.HTTPStatusError as exc:
                logger.error(f"Meta Graph media fetch failed: {exc.response.status_code} - {exc.response.text}")
                raise RuntimeError(f"Media fetch failed: {exc.response.text}") from exc
            except Exception as exc:
                logger.error(f"Media fetch connection error: {str(exc)}")
                raise RuntimeError(f"Media fetch error: {str(exc)}") from exc

    async def download_media_bytes(self, media_url: str) -> bytes:
        """Downloads the raw bytes of a WhatsApp media file from its temporary URL."""
        if self.mock_mode:
            return b""
        headers = {"Authorization": f"Bearer {self.access_token}"}
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(media_url, headers=headers, follow_redirects=True)
            resp.raise_for_status()
            return resp.content


whatsapp_client = WhatsAppClient()
