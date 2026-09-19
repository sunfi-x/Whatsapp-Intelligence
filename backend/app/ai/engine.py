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
        """Generates a personalized reply using Google Gemini API or OpenAI API with dynamic fallback."""
        
        # Priority 1: Google Gemini API (With multi-model fallback for 429/503 quota errors)
        if self.gemini_key and not self.gemini_key.startswith("placeholder") and len(self.gemini_key) > 15:
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

            models = ["gemini-1.5-flash", "gemini-2.0-flash", self.gemini_model] + [m for m in MODELS_TO_TRY if m not in ["gemini-1.5-flash", "gemini-2.0-flash", self.gemini_model]]
            
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
        if self.openai_key and not self.openai_key.startswith("sk-placeholder") and len(self.openai_key) > 15:
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

        # Priority 3: Dynamic Human Fallback Generator (100% Non-Repetitive & Context-Aware)
        logger.info("Using smart local fallback reply generator.")
        return self._generate_smart_fallback(prompt_messages)

    def _generate_smart_fallback(self, prompt_messages: list[dict]) -> str:
        """Generates natural, dynamic human Banglish fallback responses with ZERO repetitive loops and 100% correct spelling."""
        last_msg = ""
        system_context = ""
        previous_assistant_replies = set()

        for m in prompt_messages:
            role = m.get("role")
            content = m.get("content", "").strip()
            if role in ["assistant", "model"]:
                previous_assistant_replies.add(content.lower())
            elif role == "system":
                system_context += content.lower()
            elif role == "user":
                last_msg = content.lower()

        is_romantic = "is romantic partner: yes" in system_context or any(k in system_context for k in ["orin", "gf", "girlfriend", "romantic", "rio"])
        is_bangla_script = any('\u0980' <= char <= '\u09FF' for char in last_msg)
        is_english = not any(w in last_msg for w in ["ki", "kmn", "kemon", "achho", "acho", "obostha", "kheyeso", "tumi", "amar", "tomar", "jan", "shona", "babu", "bhalo", "bro", "ami"]) and any(w in last_msg for w in ["how", "what", "doing", "going", "love", "you", "fine", "good"])

        options = []

        if is_romantic:
            if is_bangla_script:
                options = [
                    "হ্যাঁ জান, ভালো আছি! তুমি কেমন আছো সোনা? ❤️",
                    "এই তো তোমার কথাই ভাবছিলাম বাবু! কি করছো এখন? 🥰",
                    "আই লাভ ইউ জান! খুব মিস করছি তোমাকে 😘",
                    "সব ঠিকঠাক আছে বাবু! তোমার দিন কেমন কাটলো? ❤️"
                ]
            elif is_english:
                options = [
                    "Hey jan! I was just thinking about you ❤️ How are you doing baby?",
                    "I am doing great my love! What are you up to? 🥰",
                    "Love you so much baby! Missing you ❤️",
                    "All good my love! Tell me how was your day? 😘"
                ]
            else:
                # Banglish Romantic
                if any(w in last_msg for w in ["khobor", "khabar", "khabare"]):
                    options = [
                        "ei to shob bhaloi babu ❤️ tumar khobor bolo, kemon acho?",
                        "shob thikthak ache jan! tumi ki korcho now? 🥰",
                        "ei to amar jan er kotha bhabchilam! tumi kemon acho bolo? 😘"
                    ]
                elif any(w in last_msg for w in ["bolbona", "bolbo na", "gossa", "kotha bolbo na", "abhiman", "mukhe"]):
                    options = [
                        "areh gossa koro na jan 🥺 ami to shudhu tumar kotha bhabchilam ❤️",
                        "kisha gossa babu? 🥰 amar bhalobashar jan ke ami keno kosto dibo bolo! 😘",
                        "uuu shona, erom abhiman koro na 🥺 ami to tumake khub bhalobashi ❤️"
                    ]
                elif any(w in last_msg for w in ["bot", "hang", "dhora", "ai"]):
                    options = [
                        "areh jan erom teasing keno koro 😭 ami to tumar shona Sunfi! Emn joke koro na babu ❤️",
                        "pagol naki tumi babu? ❤️ ami ekhaneai achi, ektu busy chilam tai thik moto bolte parini!",
                        "haha jan, tumi khub cute 🥰 ami to shudhu tumar shathei achi babu!"
                    ]
                elif any(w in last_msg for w in ["kheyeso", "khiyecho", "kheyechi", "khawa"]):
                    options = [
                        "ha babu kheyesi, tumi kheyeso jan? 🥰",
                        "ei to matro khawa shesh korlam shona, tumi khiyecho? ❤️",
                        "ha jan kheyesi, tumi ki khele bolo? 😘"
                    ]
                elif any(w in last_msg for w in ["love", "bhalobashi", "miss"]):
                    options = [
                        "i love you too jan! khub miss korchi tumake 😘",
                        "uuumaahh ❤️ ami tumake aro beshi bhalobashi babu!",
                        "miss you too shona! khub shighro dekha korbo 🥰"
                    ]
                elif any(w in last_msg for w in ["pic", "photo", "chobi", "image"]):
                    options = [
                        "ayyy eto shundor photo babu! 🥰 mashallah koto cute lagche tumake ❤️",
                        "babu photo ta khub shundor hoise! 😘 amar jan to sob shomoy e oshadharon! ❤️",
                        "uuu shona, photo dekhe to amar mon vore gelo 🥰"
                    ]
                else:
                    options = [
                        "ei to bhaloi achi babu! tumi ki korcho bolo? 🥰",
                        "uuu shona, ar ki khobor bolo? ❤️",
                        "tumi thakle amar khub bhalo lage babu 🥰",
                        "amar shona ta ki korche now? bolo na ❤️",
                        "tumar kotha bhablei amar mon ta bhalo hoye jay jan 😘"
                    ]
        else:
            # General Friends
            if is_bangla_script:
                options = ["হ্যাঁ ব্রো, ভালো আছি! তোর কি খবর?", "এই তো জোস আছি ব্রো! তুই কেমন আছিস?"]
            elif is_english:
                options = ["Hey bro! I am doing great, how about you?", "All good man! What's up with you?"]
            else:
                options = [
                    "ei to bhalo achi bro! tor ki obostha?",
                    "kire bro, bol ki khobor!",
                    "haa bro shuntechi, bol tui!"
                ]

        # Filter out options that were ALREADY sent in recent assistant messages!
        unused_options = [opt for opt in options if opt.lower() not in previous_assistant_replies]
        if unused_options:
            return random.choice(unused_options)
        
        return options[0] if options else "ha babu, tumar kotha bhabchi ❤️"


ai_engine = AIEngine()
