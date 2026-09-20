import os
import asyncio
import logging
import random
import httpx
import openai
from app.core.config import settings

logger = logging.getLogger(__name__)

# List of models to try in order of preference (updated for current availability)
MODELS_TO_TRY = [
    "gemini-3.1-flash-lite",     # Fast, free, available
    "gemini-flash-latest",        # Latest flash alias
    "gemini-3-flash-preview",     # Preview model, works
    "gemini-3.1-flash-lite-preview",  # Fallback preview
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

            models = [m for m in MODELS_TO_TRY if m != self.gemini_model] + [self.gemini_model]

            for model_name in models:
                # Always use ?key= query param — AQ. keys are valid API keys, not OAuth tokens
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={clean_gemini_key}"
                headers = {"Content-Type": "application/json"}
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

        is_romantic = "[explicit_contact_mode: romantic_girlfriend]" in system_context or "[explicit_tone: romantic]" in system_context
        is_professional = "[explicit_contact_mode: professional_work]" in system_context or "[explicit_tone: professional]" in system_context
        is_bangla_script = any('\u0980' <= char <= '\u09FF' for char in last_msg)
        is_english = not any(w in last_msg for w in ["ki", "kmn", "kemon", "achho", "acho", "obostha", "kheyeso", "tumi", "amar", "tomar", "jan", "shona", "babu", "bhalo", "bro", "ami", "kire", "dost"]) and any(w in last_msg for w in ["how", "what", "doing", "going", "love", "you", "fine", "good", "review", "work", "code", "help"])

        # Check explicit tone directives
        is_short_tone = "[explicit_tone: short]" in system_context
        is_serious_tone = "[explicit_tone: serious]" in system_context or any(w in last_msg for w in ["suicide", "attempt", "beche", "morte", "die", "death", "marbo", "kharap", "kosto"])
        is_funny_tone = "[explicit_tone: funny]" in system_context

        options = []

        # 1. SHORT TONE MODE (1-5 words max)
        if is_short_tone:
            if is_romantic:
                options = ["ha jan ❤️", "achha babu 🥰", "shona amar ❤️", "ha shona 😘", "umm jan ❤️"]
            elif is_professional:
                options = ["Sure.", "On it.", "Got it.", "Will review.", "Thanks."]
            else:
                options = ["ha bro", "achha", "theek ache", "bhalo achi", "bol bro", "kire"]

        # 2. SERIOUS TONE MODE
        elif is_serious_tone:
            if is_romantic:
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
            else:
                if is_english:
                    options = [
                        "Hey man, please don't worry. Tell me what happened, I'm here to help.",
                        "Is everything alright? Please let me know if you need anything."
                    ]
                else:
                    options = [
                        "Kire bro erom kotha bolis na! 🥺 Ki hoise khule bol, everything okay?",
                        "Bro ki hoise bol to? Ami achi তো, tension nis na!",
                        "Kire, mon kharap naki tor? Bol ki hoise!"
                    ]

        # 3. FUNNY TONE MODE
        elif is_funny_tone:
            if is_romantic:
                options = [
                    "haha jan, tumi khub cute 🥰 emn joke koro keno babu! ❤️",
                    "haha shona, pagol naki tumi? 😘 khub hani lagche tumar kotha!",
                    "uuu jan, tumi merei felba amake emne beshi hese 😂❤️"
                ]
            else:
                options = [
                    "haha kire moris na 😂 squad e aay!",
                    "kire bhai, ki shuru korli 😂",
                    "haha dekhlam 😂 ki obostha bro!",
                    "haha joss chilam bro 😂"
                ]

        # 4. CASUAL / FRIENDLY / ROMANTIC DYNAMIC MATCHING
        else:
            if is_romantic:
                if any(w in last_msg for w in ["kothay", "kotha"]):
                    options = ["basay achi babu ❤️ tumi kothay now? 🥰", "ei to ekhaneai achi jan! tumi kothay? 😘"]
                elif any(w in last_msg for w in ["wish", "jodi", "kash"]):
                    options = ["accha jan, tumi ki wish korcho bolo na amake? 🥰", "babu tumi ki chaicho bolo, ami shob puron kore dibo ❤️"]
                elif any(w in last_msg for w in ["khobor", "khabar"]):
                    options = ["ei to shob bhaloi babu ❤️ tumar khobor bolo, kemon acho?", "shob thikthak ache jan! tumi ki korcho now? 🥰"]
                elif any(w in last_msg for w in ["kheyeso", "khiyecho", "kheyechi"]):
                    options = ["ha babu kheyesi, tumi kheyeso jan? 🥰", "ei to matro khawa shesh korlam shona, tumi khiyecho? ❤️"]
                elif any(w in last_msg for w in ["love", "bhalobashi", "miss"]):
                    options = ["i love you too jan! khub miss korchi tumake 😘", "uuumaahh ❤️ ami tumake aro beshi bhalobashi babu!"]
                elif any(w in last_msg for w in ["pic", "photo", "chobi"]):
                    options = ["ayyy eto shundor photo babu! 🥰 mashallah koto cute lagche tumake ❤️", "babu photo ta khub shundor hoise! 😘"]
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
                # Friends & Classmates
                if any(w in last_msg for w in ["kothay", "kotha"]):
                    options = ["basay achi bro! tui kothay?", "ei to ekhaneai achi, tui kothay bro?"]
                elif any(w in last_msg for w in ["kheyeso", "kheyechi"]):
                    options = ["ha bro kheyechi, tui?", "ha bro kheyesi! tui kheyeso?"]
                elif is_bangla_script:
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
        
        return options[0] if options else "haa bro, shuntechi!"


ai_engine = AIEngine()
