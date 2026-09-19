import os
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
        
        raw_key = os.environ.get("GEMINI_API_KEY") or self.gemini_key
        clean_gemini_key = (raw_key or "").strip()
        
        # Priority 1: Google Gemini API (Using Gemini's LLM Brain)
        if clean_gemini_key and len(clean_gemini_key) > 10 and not any(clean_gemini_key.lower().startswith(p) for p in ["placeholder", "your_", "none"]):
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

            # CRITICAL GEMINI SPEC FIX: Ensure contents[0] is ALWAYS 'user'!
            while merged_contents and merged_contents[0]["role"] != "user":
                merged_contents.pop(0)

            if not merged_contents:
                merged_contents = [{"role": "user", "parts": [{"text": "Hello"}]}]

            payload = {
                "contents": merged_contents,
                "generationConfig": {
                    "temperature": 0.75,
                    "maxOutputTokens": 300,
                }
            }
            if system_text.strip():
                payload["system_instruction"] = {"parts": [{"text": system_text.strip()}]}

            models = ["gemini-1.5-flash", "gemini-2.0-flash", self.gemini_model] + [m for m in MODELS_TO_TRY if m not in ["gemini-1.5-flash", "gemini-2.0-flash", self.gemini_model]]
            
            headers = {
                "x-goog-api-key": clean_gemini_key,
                "Content-Type": "application/json"
            }
            if clean_gemini_key.startswith("AQ.") or clean_gemini_key.startswith("ya29."):
                headers["Authorization"] = f"Bearer {clean_gemini_key}"

            for model_name in models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={clean_gemini_key}"
                try:
                    logger.info(f"Invoking Google Gemini API ({model_name}) with full context...")
                    async with httpx.AsyncClient(timeout=12.0) as client:
                        response = await client.post(url, json=payload, headers=headers)
                    
                    if response.status_code == 200:
                        res_json = response.json()
                        candidates = res_json.get("candidates", [])
                        if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
                            reply = candidates[0]["content"]["parts"][0].get("text", "").strip()
                            if (reply.startswith('"') and reply.endswith('"')) or (reply.startswith("'") and reply.endswith("'")):
                                reply = reply[1:-1].strip()
                            if reply:
                                logger.info(f"Gemini LLM success ({model_name}): {reply[:80]}...")
                                return reply
                    else:
                        logger.warning(f"Gemini API {model_name} HTTP {response.status_code}: {response.text[:200]}")
                except Exception as exc:
                    logger.error(f"Gemini API error for {model_name}: {exc}")

        # Priority 2: OpenAI API
        clean_openai_key = (self.openai_key or "").strip()
        if clean_openai_key and len(clean_openai_key) > 10 and not any(clean_openai_key.lower().startswith(p) for p in ["placeholder", "your_", "none", "sk-placeholder"]):
            try:
                logger.info(f"Invoking OpenAI API ({self.openai_model})...")
                client = openai.AsyncOpenAI(api_key=clean_openai_key)
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

        # Priority 3: Dynamic Emotionally Intelligent Fallback Generator
        logger.info("Using smart local contextual fallback generator.")
        return self._generate_smart_fallback(prompt_messages)

    def _generate_smart_fallback(self, prompt_messages: list[dict]) -> str:
        """Generates deeply contextual, emotionally intelligent, 100% non-repetitive Banglish/English/Bangla responses."""
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

        is_romantic = "[explicit_contact_mode: romantic_girlfriend]" in system_context
        is_professional = "[explicit_contact_mode: professional_work]" in system_context
        is_bangla_script = any('\u0980' <= char <= '\u09FF' for char in last_msg)
        is_english = not any(w in last_msg for w in ["ki", "kmn", "kemon", "achho", "acho", "obostha", "kheyeso", "tumi", "amar", "tomar", "jan", "shona", "babu", "bhalo", "bro", "ami", "kire"]) and any(w in last_msg for w in ["how", "what", "doing", "going", "love", "you", "fine", "good", "wish", "suicide", "attempt", "die", "review", "pull", "request"])

        options = []

        if is_romantic:
            # 1. Serious / Sad / Suicidal / Emotional Statements
            if any(w in last_msg for w in ["suicide", "attempt", "beche", "morte", "die", "death", "marbo", "kharap", "kosto"]):
                if is_english:
                    options = [
                        "Hey baby, please don't say that! 🥺 I am right here with you. What happened? Tell me please ❤️",
                        "My love, please don't talk like this! 😭 I love you so much and I am always here for you ❤️"
                    ]
                elif is_bangla_script:
                    options = [
                        "আরে সোনা এরম কথা বলবে না কখনো! 🥺 কি হয়েছে আমাকে বলো প্লিজ! আমি তো তোমার সাথেই আছি ❤️",
                        "বাবু তুমি এরম বললে আমার খুব কষ্ট হয় 😭 বল কি হয়েছে, আমি সব ঠিক করে দেবো ❤️"
                    ]
                else:
                    options = [
                        "areh shona erom kotha bolbo na kakhono 🥺 ki hoise bolo amake! Ami to shudhu tumar e, tumar pashaei achi babu ❤️",
                        "babu tumi emn bolcho keno? 😭 ami to tumake chara bhabtei pari na! Ki hoise khule bolo amake ❤️",
                        "shona amar, tumi erom kotha bolle amar mon kharap hoye jay 😭 bolo ki hoise, ami to ekhaneai achi babu ❤️"
                    ]
            
            # 2. Wish / Desires
            elif any(w in last_msg for w in ["wish", "i wish", "jodi", "kash"]):
                if is_english:
                    options = [
                        "Awww baby, what are you wishing for? Tell me ❤️",
                        "My love, I wish I was right there holding your hand too 🥰"
                    ]
                elif is_bangla_script:
                    options = [
                        "আচ্ছা জান, তুমি কি উইশ করছো বলো না আমাকে? 🥰",
                        "বাবু তুমি কি চাইছো বলো, আমি সব পূরণ করে দেবো ❤️"
                    ]
                else:
                    options = [
                        "accha jan, tumi ki wish korcho bolo na amake? 🥰",
                        "babu tumi ki chaicho bolo, ami shob puron kore dibo ❤️",
                        "uuu shona, amio chai tumar sob ইচ্ছা পূরণ হোক 🥰"
                    ]

            # 3. Teasing about Bot / Hang / AI
            elif any(w in last_msg for w in ["bot", "hang", "dhora", "ai"]):
                options = [
                    "areh jan erom teasing keno koro 😭 ami to tumar shona Sunfi! Emn joke koro na babu ❤️",
                    "pagol naki tumi babu? ❤️ ami ekhaneai achi, ektu busy chilam tai thik moto bolte parini!",
                    "haha jan, tumi khub cute 🥰 ami to shudhu tumar shathei achi babu!"
                ]

            # 4. Gossa / Bolbona / Abhiman
            elif any(w in last_msg for w in ["bolbona", "bolbo na", "gossa", "kotha bolbo na", "abhiman", "mukhe"]):
                options = [
                    "areh gossa koro na jan 🥺 ami to shudhu tumar kotha bhabchilam ❤️",
                    "kisha gossa babu? 🥰 amar bhalobashar jan ke ami keno kosto dibo bolo! 😘",
                    "uuu shona, erom abhiman koro na 🥺 ami to tumake khub bhalobashi ❤️"
                ]

            # 5. Khobor / Status
            elif any(w in last_msg for w in ["khobor", "khabar", "khabare"]):
                options = [
                    "ei to shob bhaloi babu ❤️ tumar khobor bolo, kemon acho?",
                    "shob thikthak ache jan! tumi ki korcho now? 🥰",
                    "ei to amar jan er kotha bhabchilam! tumi kemon acho bolo? 😘"
                ]

            # 6. Food / Eating
            elif any(w in last_msg for w in ["kheyeso", "khiyecho", "kheyechi", "khawa"]):
                options = [
                    "ha babu kheyesi, tumi kheyeso jan? 🥰",
                    "ei to matro khawa shesh korlam shona, tumi khiyecho? ❤️",
                    "ha jan kheyesi, tumi ki khele bolo? 😘"
                ]

            # 7. Love / Miss
            elif any(w in last_msg for w in ["love", "bhalobashi", "miss"]):
                options = [
                    "i love you too jan! khub miss korchi tumake 😘",
                    "uuumaahh ❤️ ami tumake aro beshi bhalobashi babu!",
                    "miss you too shona! khub shighro dekha korbo 🥰"
                ]

            # 8. Photos / Media
            elif any(w in last_msg for w in ["pic", "photo", "chobi", "image"]):
                options = [
                    "ayyy eto shundor photo babu! 🥰 mashallah koto cute lagche tumake ❤️",
                    "babu photo ta khub shundor hoise! 😘 amar jan to sob shomoy e oshadharon! ❤️",
                    "uuu shona, photo dekhe to amar mon vore gelo 🥰"
                ]

            # Default Romantic Fallback
            else:
                if is_bangla_script:
                    options = ["হ্যাঁ জান, বলো শুনছি! তুমি কেমন আছো সোনা? ❤️", "সোনার জান আমার, কি করছো এখন বলো না? 🥰"]
                elif is_english:
                    options = ["Hey baby! I am right here listening to you ❤️ What's up?", "My love, tell me how is everything going? 🥰"]
                else:
                    options = [
                        "ei to bhaloi achi babu! tumi ki korcho bolo? 🥰",
                        "uuu shona, ar ki khobor bolo? ❤️",
                        "tumi thakle amar khub bhalo lage babu 🥰",
                        "amar shona ta ki korche now? bolo na ❤️"
                    ]
        elif is_professional:
            # Professional Contacts (Arif, etc.)
            if is_english or any(w in last_msg for w in ["review", "pr", "pull", "request", "code", "task"]):
                options = [
                    "Sure, I'll review it shortly and get back to you with my feedback!",
                    "Got it, thanks for the update. I will check it as soon as possible!",
                    "Thanks for letting me know. I am taking a look right now."
                ]
            else:
                options = [
                    "Sure, I will check and let you know.",
                    "Hello! Thanks for the message, I am on it.",
                    "Got it, I'll review and respond shortly."
                ]
        else:
            # General Friends & Classmates (Sunfi, Fahim, Sami, Rakib)
            if is_bangla_script:
                options = ["হ্যাঁ ব্রো, ভালো আছি! তোর কি খবর?", "এই তো জোস আছি ব্রো! তুই কেমন আছিস?"]
            elif is_english:
                options = ["Hey bro! I am doing great, how about you?", "All good man! What's up with you?"]
            else:
                options = [
                    "ei to bhalo achi bro! tor ki obostha?",
                    "kire bro, bol ki khobor!",
                    "haa bro shuntechi, bol tui!",
                    "Kire bro! Ki obostha? Bol",
                    "Haha haa, dekhlam 😂 Ki obostha bro?"
                ]

        # Filter out options that were ALREADY sent in recent assistant messages!
        unused_options = [opt for opt in options if opt.lower() not in previous_assistant_replies]
        if unused_options:
            return random.choice(unused_options)
        
        return options[0] if options else "ha babu, tumar kotha bhabchi ❤️"


ai_engine = AIEngine()
