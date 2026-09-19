import asyncio
import logging
import httpx
import openai
from app.core.config import settings

logger = logging.getLogger(__name__)

# List of models to try in order of preference
MODELS_TO_TRY = ["gemini-3.5-flash", "gemini-3.6-flash"]


class AIEngine:
    """Multi-Provider AI Interaction Service (Google Gemini & OpenAI) with automatic model fallback."""

    def __init__(self):
        self.openai_key = settings.OPENAI_API_KEY
        self.openai_model = settings.OPENAI_MODEL
        self.gemini_key = settings.GEMINI_API_KEY
        self.gemini_model = settings.GEMINI_MODEL

    async def generate_reply(self, prompt_messages: list[dict], fallback_text: str = "bhalo achi bro 😭 tor?") -> str:
        """Generates a personalized reply using Google Gemini API or OpenAI API."""
        
        # Priority 1: Google Gemini API (With multi-model fallback for 429/503 quota errors)
        if self.gemini_key and not self.gemini_key.startswith("placeholder") and len(self.gemini_key) > 5:
            # Prepare system text and merged contents
            system_text = ""
            raw_contents = []
            for m in prompt_messages:
                role = m.get("role")
                content = m.get("content", "").strip()
                if not content:
                    continue
                if role == "system":
                    system_text += content + "\n\n"
                elif role == "user":
                    raw_contents.append({"role": "user", "parts": [{"text": content}]})
                elif role in ["assistant", "model"]:
                    raw_contents.append({"role": "model", "parts": [{"text": content}]})

            # Merge consecutive roles for strict alternation (user <-> model)
            merged_contents = []
            for item in raw_contents:
                if not merged_contents:
                    merged_contents.append(item)
                else:
                    last_item = merged_contents[-1]
                    if last_item["role"] == item["role"]:
                        existing_text = last_item["parts"][0]["text"]
                        new_text = item["parts"][0]["text"]
                        last_item["parts"][0]["text"] = f"{existing_text}\n{new_text}"
                    else:
                        merged_contents.append(item)

            if not merged_contents:
                merged_contents = [{"role": "user", "parts": [{"text": "Hello"}]}]

            payload = {
                "contents": merged_contents,
                "generationConfig": {
                    "temperature": 0.75,
                    "maxOutputTokens": 250,
                }
            }
            if system_text.strip():
                payload["system_instruction"] = {"parts": [{"text": system_text.strip()}]}

            # Try models in list (gemini-3.5-flash -> gemini-3.6-flash)
            models = [self.gemini_model] + [m for m in MODELS_TO_TRY if m != self.gemini_model]
            
            for model_name in models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.gemini_key}"
                try:
                    logger.info(f"Invoking Google Gemini API ({model_name})...")
                    async with httpx.AsyncClient(timeout=12.0) as client:
                        response = await client.post(url, json=payload)
                    
                    if response.status_code == 200:
                        res_json = response.json()
                        candidates = res_json.get("candidates", [])
                        if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
                            reply = candidates[0]["content"]["parts"][0].get("text", "").strip()
                            if (reply.startswith('"') and reply.endswith('"')) or (reply.startswith("'") and reply.endswith("'")):
                                reply = reply[1:-1].strip()
                            if reply:
                                logger.info(f"Gemini API success ({model_name}): {reply[:80]}...")
                                return reply
                    else:
                        logger.warning(f"Gemini API {model_name} HTTP {response.status_code}: {response.text[:150]}")
                except Exception as exc:
                    logger.error(f"Gemini API error for {model_name}: {exc}")

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

        # Priority 3: Natural Human Fallback Generator
        logger.info("Using smart local fallback reply generator.")
        return self._generate_smart_fallback(prompt_messages)

    def _generate_smart_fallback(self, prompt_messages: list[dict]) -> str:
        """Generates natural, high-quality human Banglish fallback responses."""
        last_msg = ""
        system_context = ""
        for m in reversed(prompt_messages):
            if m.get("role") == "user":
                last_msg = m.get("content", "").lower()
            elif m.get("role") == "system":
                system_context = m.get("content", "").lower()

        is_romantic = any(kw in system_context for kw in ["romantic", "girl", "love", "gf"])

        if is_romantic:
            if any(w in last_msg for w in ["khiyecho", "khabar", "kheyeso", "ate", "khaba"]):
                return "ha babu kheyesi, tumi kheyeso jan? 🥰"
            elif any(w in last_msg for w in ["kmn", "kemon", "ki obostha", "how"]):
                return "tumar kotha bhabchi babu ❤️ tumi kemon acho?"
            elif any(w in last_msg for w in ["love", "bhalobashi", "miss"]):
                return "i love you too jan! khub miss korchi tumake 😘"
            else:
                return "ha jan, bolo na shuntechi 🥰 ki korcho?"

        # General Friends / Casual
        if any(w in last_msg for w in ["bhalo lagtese na", "kharap", "sad", "mon kharap"]):
            return "ki hoilo bro? mon kharap keno? 🥺"
        elif any(w in last_msg for w in ["kire", "kireee", "hey", "hello", "bro", "hi"]):
            return "ki obostha bro? bolo shuntechi!"
        elif any(w in last_msg for w in ["kmn", "kemon", "ki khobor"]):
            return "bhalo achi bro! tor ki obostha?"
        elif any(w in last_msg for w in ["ashbi", "jabi", "campus", "adda"]):
            return "ha bro ashbo mone hoy, ekshathe jabo ne!"
        elif any(w in last_msg for w in ["ki", "kono", "problem"]):
            return "bujhlam bro, bolo ki bolba!"
        else:
            return "achha bujhlam bro! pore kotha bolchi, ekon ektu busy achi."


ai_engine = AIEngine()
