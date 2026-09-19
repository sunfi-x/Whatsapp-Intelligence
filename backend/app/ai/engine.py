import asyncio
import logging
import random
import httpx
import openai
from app.core.config import settings

logger = logging.getLogger(__name__)

# List of models to try in order of preference (high-quota models first)
MODELS_TO_TRY = [
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-flash-latest"
]


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
                    "temperature": 0.8,
                    "maxOutputTokens": 1000,
                }
            }
            if system_text.strip():
                payload["system_instruction"] = {"parts": [{"text": system_text.strip()}]}

            # Try models in list (gemini-2.5-flash -> gemini-flash-latest -> gemini-2.5-flash-lite -> ...)
            models = ["gemini-2.5-flash", "gemini-flash-latest", self.gemini_model] + [m for m in MODELS_TO_TRY if m not in ["gemini-2.5-flash", "gemini-flash-latest", self.gemini_model]]
            
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

        # Priority 3: Dynamic Human Fallback Generator (Non-repetitive)
        logger.info("Using smart local fallback reply generator.")
        return self._generate_smart_fallback(prompt_messages)

    def _generate_smart_fallback(self, prompt_messages: list[dict]) -> str:
        """Generates natural, dynamic human Banglish fallback responses with zero repetitive loops."""
        last_msg = ""
        system_context = ""
        for m in reversed(prompt_messages):
            if m.get("role") == "user":
                last_msg = m.get("content", "").lower()
                break
        for m in prompt_messages:
            if m.get("role") == "system":
                system_context += m.get("content", "").lower()

        is_romantic = "is romantic partner: yes" in system_context

        if is_romantic:
            if any(w in last_msg for w in ["khiyecho", "khabar", "kheyeso", "ate", "khaba"]):
                return random.choice([
                    "ha babu kheyesi, tumi kheyeso jan? 🥰",
                    "ei to matro khawa shesh korlam shona, tumi khiyecho? ❤️",
                    "ha jan kheyechi, tumi ki khele bolo? 😘"
                ])
            elif any(w in last_msg for w in ["kmn", "kemon", "ki obostha", "how"]):
                return random.choice([
                    "tumar kotha bhabchi babu ❤️ tumi kemon acho?",
                    "bhalo achi jan! tumar din kemon katlo? 🥰",
                    "ei to bhaloi babu! tumi kemon acho bolo? 😘"
                ])
            elif any(w in last_msg for w in ["love", "bhalobashi", "miss"]):
                return random.choice([
                    "i love you too jan! khub miss korchi tumake 😘",
                    "uuumaahh ❤️ ami tumake aro beshi bhalobashi babu!",
                    "miss you too shona! khub shighro dekha korbo 🥰"
                ])
            elif any(w in last_msg for w in ["bot", "ai", "banaise", "system", "text", "bari"]):
                return random.choice([
                    "areh jan erom bolcho keno? 🥺 ami to shotti shotti tumar shathe kotha bolchi!",
                    "pagol naki tumi babu? ❤️ ami ekhaneai achi, ektu busy chilam tai thik moto bolte parini!",
                    "haha jan, tumi khub cute 🥰 gossa koro na babu, bolo ki bolba!"
                ])
            else:
                return random.choice([
                    "accha babu, tumi ki korcho bolla na to? 🥰",
                    "uuu shona, ar ki khobor bolo? ❤️",
                    "ha jan shuntechi, bolo na r ki kotha ache 😘",
                    "tumi thakle amar khub bhalo lage babu 🥰",
                    "ki bhabcho jan? bolo na muke! ❤️"
                ])

        # General Friends / Casual
        if any(w in last_msg for w in ["bhalo lagtese na", "kharap", "sad", "mon kharap"]):
            return random.choice([
                "ki hoilo bro? mon kharap keno? 🥺",
                "kono somossa hoise naki bro? bolo shuntechi!",
                "mon kharap korish na bro, shob thik hoye jabe!"
            ])
        elif any(w in last_msg for w in ["kire", "kireee", "hey", "hello", "bro", "hi"]):
            return random.choice([
                "ki obostha bro? bolo shuntechi!",
                "kire bro, bol ki khobor!",
                "haa bro, bol ki bolba!"
            ])
        elif any(w in last_msg for w in ["kmn", "kemon", "ki khobor"]):
            return random.choice([
                "bhalo achi bro! tor ki obostha?",
                "ei to joss achi bro! tor din kemon jacche?",
                "bhaloi achi bro, tor kono khobor ase?"
            ])
        elif any(w in last_msg for w in ["ashbi", "jabi", "campus", "adda"]):
            return random.choice([
                "ha bro ashbo mone hoy, ekshathe jabo ne!",
                "dekhi bro, ektu pore janacchi tor sathe!",
                "ha bro jabo, koytay ber hobi?"
            ])
        else:
            return random.choice([
                "achha bujhlam bro! pore kotha bolchi, ekon ektu busy achi.",
                "ha bro shuntechi, bol tui!",
                "bujhlam bro, r ki khobor?"
            ])


ai_engine = AIEngine()
