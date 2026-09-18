import asyncio
import logging
import httpx
import openai
from app.core.config import settings

logger = logging.getLogger(__name__)

# Retry config for transient Gemini API errors (503, 429, etc.)
MAX_RETRIES = 3
RETRY_BACKOFF_SECONDS = [1.0, 2.0, 4.0]


class AIEngine:
    """Multi-Provider AI Interaction Service (Google Gemini & OpenAI) with safe fallback handling."""

    def __init__(self):
        self.openai_key = settings.OPENAI_API_KEY
        self.openai_model = settings.OPENAI_MODEL
        self.gemini_key = settings.GEMINI_API_KEY
        self.gemini_model = settings.GEMINI_MODEL

    async def generate_reply(self, prompt_messages: list[dict], fallback_text: str = "bhalo achi bro 😭 tor?") -> str:
        """Generates a personalized reply using Google Gemini API or OpenAI API."""
        
        # Priority 1: Google Gemini API (Native REST with retry for transient errors)
        if self.gemini_key and not self.gemini_key.startswith("placeholder") and len(self.gemini_key) > 5:
            try:
                logger.info(f"Invoking Google Gemini API ({self.gemini_model})...")
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_key}"
                
                # Format system instructions and prompt contents for Gemini REST API
                system_text = ""
                contents = []
                for m in prompt_messages:
                    role = m.get("role")
                    content = m.get("content", "")
                    if role == "system":
                        system_text += content + "\n"
                    elif role == "user":
                        contents.append({"role": "user", "parts": [{"text": content}]})
                    elif role in ["assistant", "model"]:
                        contents.append({"role": "model", "parts": [{"text": content}]})

                payload = {}
                if system_text.strip():
                    payload["system_instruction"] = {"parts": [{"text": system_text.strip()}]}
                payload["contents"] = contents if contents else [{"parts": [{"text": "Hello"}]}]

                # Retry loop for transient errors (503 high demand, 429 rate limit)
                last_error_msg = ""
                for attempt in range(MAX_RETRIES):
                    async with httpx.AsyncClient(timeout=20.0) as client:
                        response = await client.post(url, json=payload)
                    
                    if response.status_code == 200:
                        res_json = response.json()
                        candidates = res_json.get("candidates", [])
                        if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
                            reply = candidates[0]["content"]["parts"][0].get("text", "").strip()
                            if (reply.startswith('"') and reply.endswith('"')) or (reply.startswith("'") and reply.endswith("'")):
                                reply = reply[1:-1].strip()
                            if reply:
                                logger.info(f"Gemini API success (attempt {attempt + 1}): {reply[:80]}...")
                                return reply
                        # Empty candidate — treat as transient, retry
                        last_error_msg = "Empty candidate response"
                    elif response.status_code in (503, 429, 500):
                        # Transient error — retry with backoff
                        wait = RETRY_BACKOFF_SECONDS[min(attempt, len(RETRY_BACKOFF_SECONDS) - 1)]
                        logger.warning(f"Gemini API {response.status_code} (attempt {attempt + 1}/{MAX_RETRIES}), retrying in {wait}s...")
                        last_error_msg = f"HTTP {response.status_code}: {response.text[:200]}"
                        await asyncio.sleep(wait)
                        continue
                    else:
                        # Non-retryable error (400, 401, 403, 404) — break immediately
                        logger.error(f"Gemini API non-retryable error {response.status_code}: {response.text[:300]}")
                        last_error_msg = f"HTTP {response.status_code}"
                        break
                
                if last_error_msg:
                    logger.error(f"Gemini API failed after {MAX_RETRIES} attempts: {last_error_msg}")
            except Exception as exc:
                logger.error(f"Google Gemini API error: {exc}")
                # Fall through to next provider

        # Priority 2: OpenAI API
        if self.openai_key and not self.openai_key.startswith("sk-placeholder") and self.openai_key != "sk-placeholder-key":
            try:
                logger.info(f"Invoking OpenAI API ({self.openai_model})...")
                client = openai.AsyncOpenAI(api_key=self.openai_key)
                response = await client.chat.completions.create(
                    model=self.openai_model,
                    messages=prompt_messages,
                    temperature=0.7,
                    max_tokens=250,
                )
                reply = response.choices[0].message.content.strip()
                if (reply.startswith('"') and reply.endswith('"')) or (reply.startswith("'") and reply.endswith("'")):
                    reply = reply[1:-1].strip()
                return reply
            except Exception as exc:
                logger.error(f"OpenAI API generation error: {exc}")

        # Priority 3: Smart Local Fallback Generator
        logger.info("Using smart local fallback reply generator.")
        return self._generate_smart_fallback(prompt_messages)

    def _generate_smart_fallback(self, prompt_messages: list[dict]) -> str:
        """Generates contextually natural fallback responses for testing/offline mode."""
        last_msg = ""
        for m in reversed(prompt_messages):
            if m.get("role") == "user":
                last_msg = m.get("content", "").lower()
                break
        
        # Mood / Feeling expressions
        if any(w in last_msg for w in ["bhalo lagtese na", "kharap", "sad", "bore", "boring", "mon kharap"]):
            return "ki hoilo bro? mon kharap keno? 🥺"
        # Short interjections / callouts
        elif any(w in last_msg for w in ["kire", "kireee", "hey", "hello", "bro"]):
            return "bol bro, ki obostha? shuntechi!"
        # Status / Greetings
        elif any(w in last_msg for w in ["ki obostha", "kemon achis", "how are you", "what's up"]):
            return "bhalo achi bro 😭 tor ki obostha?"
        # Event / Coming / Campus
        elif any(w in last_msg for w in ["ashbi", "ashbi?", "come", "campus", "jabi"]):
            return "ha bro ashbo mone hoy 😭 chal ekshathe jai"
        # Time queries
        elif any(w in last_msg for w in ["koytay", "koyta", "time", "when"]):
            return "probably 11tar dike dekhbo"
        # Class / Exam
        elif any(w in last_msg for w in ["class", "exam", "assignment", "lab"]):
            return "ha bro, class er shomoy ashbo"
        # Location queries
        elif any(w in last_msg for w in ["koi", "kothay", "where"]):
            return "basay achi bro, tui koi?"
        else:
            # Dynamic hash-based rotation for fallback variety so it never repeats
            options = [
                "ha bro, bujhlam. ar bolo?",
                "achha achha, oshudha nai bro!",
                "bujhlam bro, ar ki khobor?",
                "sothik bujhlam bro, kalke kotha bolbo ne!"
            ]
            msg_hash = sum(ord(c) for c in last_msg)
            return options[msg_hash % len(options)]


ai_engine = AIEngine()
