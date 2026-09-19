import json
from app.ai.persona import SYSTEM_RULES, DEFAULT_PERSONA, ROMANTIC_PERSONA, FRIEND_PERSONA, PROFESSIONAL_PERSONA, TONE_PROMPTS_DEFAULT


def _extract_tone_prompt(personality_json: str | None, tone: str) -> str | None:
    """
    Extracts tone-specific prompt from the personality JSON stored in settings.
    Falls back to TONE_PROMPTS_DEFAULT if not found.
    """
    if not personality_json or not personality_json.strip():
        return TONE_PROMPTS_DEFAULT.get(tone)

    try:
        data = json.loads(personality_json)
        if isinstance(data, dict):
            # Try exact match first, then case-insensitive
            prompt = data.get(tone) or data.get(tone.lower()) or data.get(tone.capitalize())
            if prompt and prompt.strip():
                return prompt.strip()
        # If it's a plain string (old format), return as-is for backward compatibility
        elif isinstance(data, str) and data.strip():
            return data.strip()
    except (json.JSONDecodeError, TypeError):
        # Old plain-text format — use as-is
        if personality_json.strip():
            return personality_json.strip()

    return TONE_PROMPTS_DEFAULT.get(tone)


def build_ai_prompt(
    current_message: str,
    recent_messages: list[dict],
    contact_name: str,
    relationship: str,
    preferred_language: str,
    preferred_tone: str,
    notes: str | None = None,
    summary: str | None = None,
    important_context: str | None = None,
    persona_override: str | None = None,
    tone_override: str | None = None
) -> list[dict]:
    """Assembles a modular system prompt and chat history context for AI Engine."""
    
    tone = (tone_override if tone_override and tone_override.strip() else preferred_tone) or "Casual"

    rel_lower = (relationship or "").lower()
    tone_lower = (tone or "").lower()
    lang_lower = (preferred_language or "banglish").lower()

    # Determine script of current message
    is_bangla_script_msg = any('\u0980' <= char <= '\u09FF' for char in current_message)

    # ─── Relationship Classification ──────────────────────────────────────────
    is_romantic = any(kw in rel_lower for kw in ["girl", "gf", "romantic", "love", "loving", "flirty"])
    is_professional = any(kw in rel_lower for kw in ["work", "professional", "boss", "colleague", "lead"])
    is_friend = not (is_romantic or is_professional)

    # Tone-based overrides (tone can elevate relationship context)
    if "romantic" in tone_lower:
        is_romantic = True
        is_professional = False
        is_friend = False
    elif "professional" in tone_lower:
        is_professional = True
        is_romantic = False
        is_friend = False

    # ─── Mode Tag & Base Persona ───────────────────────────────────────────────
    if is_romantic:
        selected_persona = f"{DEFAULT_PERSONA}\n\n{ROMANTIC_PERSONA}"
        mode_tag = "[EXPLICIT_CONTACT_MODE: ROMANTIC_GIRLFRIEND]"
    elif is_professional:
        selected_persona = f"{DEFAULT_PERSONA}\n\n{PROFESSIONAL_PERSONA}"
        mode_tag = "[EXPLICIT_CONTACT_MODE: PROFESSIONAL_WORK]"
    else:
        selected_persona = f"{DEFAULT_PERSONA}\n\n{FRIEND_PERSONA}"
        mode_tag = "[EXPLICIT_CONTACT_MODE: FRIEND_CLASSMATE]"

    # ─── Tone-Specific Persona Prompt (from Settings JSON or Default) ──────────
    # Extract the tone-specific prompt saved in settings
    tone_persona_prompt = _extract_tone_prompt(persona_override, tone)

    # ─── Tone Mode Directives ─────────────────────────────────────────────────
    if "short" in tone_lower:
        tone_instruction = """[EXPLICIT_TONE: SHORT]
CRITICAL MANDATORY TONE INSTRUCTION:
- Reply in 1 to 5 WORDS MAXIMUM! Extremely brief, direct, and concise (e.g. 'ha bro', 'achha theek ache', 'bhalo achi', 'on it'). DO NOT write full sentences or long paragraphs!"""

    elif "serious" in tone_lower:
        tone_instruction = """[EXPLICIT_TONE: SERIOUS]
CRITICAL MANDATORY TONE INSTRUCTION:
- Reply with SERIOUS, mature, grounded, non-joking attention.
- ABSOLUTELY NO romantic words (jan/babu/shona/love). ABSOLUTELY NO jokes or emojis.
- Tone: calm, firm, direct — like having an important, serious conversation.
- If contact is a friend: speak like a concerned, sincere friend (e.g. 'Kire bro, ki hoise? Bol, ami achi').
- If contact is professional: speak formally and clearly in English."""

    elif "funny" in tone_lower:
        tone_instruction = """[EXPLICIT_TONE: FUNNY]
CRITICAL MANDATORY TONE INSTRUCTION:
- Reply with witty humor, playful jokes, funny banter, and lighthearted sarcasm (e.g. 'haha kire moris na 😂 squad e aay!', 'haha dekhlam 😂'). Use funny emojis (😂, 🤣).
- ABSOLUTELY NO romantic words (jan/babu/shona) for non-romantic contacts."""

    elif "friendly" in tone_lower:
        tone_instruction = """[EXPLICIT_TONE: FRIENDLY]
CRITICAL MANDATORY TONE INSTRUCTION:
- Reply with warm, welcoming, friendly, and close buddy vibes (e.g. 'kire dost kemon achis? shob thikthak?'). 
- ABSOLUTELY NO romantic endearments (jan/babu/shona) unless contact is explicitly the romantic partner!"""

    elif "professional" in tone_lower or is_professional:
        tone_instruction = """[EXPLICIT_TONE: PROFESSIONAL]
CRITICAL MANDATORY TONE INSTRUCTION:
- Reply in clear, polite, formal, respectful, and efficient work tone (e.g. 'Sure, I will review it shortly and get back to you with feedback.'). ABSOLUTELY NO informal slang, NO romantic endearments!"""

    elif "romantic" in tone_lower or is_romantic:
        tone_instruction = """[EXPLICIT_TONE: ROMANTIC]
CRITICAL MANDATORY TONE INSTRUCTION:
- Reply as a deeply loving, sweet, affectionate, and caring boyfriend using romantic endearments ('jan', 'babu', 'shona', 'tumi', 🥰, 😘, ❤️). ONLY for romantic partner!"""

    else:
        tone_instruction = """[EXPLICIT_TONE: CASUAL]
CRITICAL MANDATORY TONE INSTRUCTION:
- Reply in everyday relaxed, natural, conversational WhatsApp texting style (1 short sentence max, e.g. 'ei to bhalo achi bro! tor ki obostha?')."""

    # ─── Language Directive ────────────────────────────────────────────────────
    if is_bangla_script_msg:
        lang_directive = "MANDATORY OUTPUT LANGUAGE: BENGALI SCRIPT (বাংলা). Reply using proper Bengali script characters!"
    elif ("english" in lang_lower and is_professional) or "professional" in tone_lower:
        lang_directive = "MANDATORY OUTPUT LANGUAGE: ENGLISH. Reply in clear, natural, professional English."
    else:
        lang_directive = "MANDATORY OUTPUT LANGUAGE: BANGLISH (Bangla spoken words written using English/Roman alphabet, e.g. 'kemon acho', 'bhalo achi bro', 'ki korcho jan'). DO NOT reply in plain English!"

    # ─── Assemble System Prompt ───────────────────────────────────────────────
    system_content = f"""{SYSTEM_RULES}

{mode_tag}

{tone_instruction}

### MANDATORY OUTPUT LANGUAGE DIRECTIVE:
{lang_directive}

### TONE-SPECIFIC PERSONA INSTRUCTIONS:
{tone_persona_prompt or selected_persona}

### CONTACT PROFILE:
- Contact Name: {contact_name}
- Relationship Type: {relationship}
- Preferred Language: {preferred_language}
- Target Tone: {tone}
- Contact Notes: {notes or 'None'}

### LONG-TERM CONVERSATION MEMORY:
- Summary: {summary or 'No historical summary available.'}
- Important Context: {important_context or 'None'}
"""

    # ─── Media Hint ───────────────────────────────────────────────────────────
    is_photo = any(kw in current_message.lower() for kw in ["photo", "image", "📷", "picture", "[image"])
    if is_photo:
        if is_romantic:
            system_content += "\n\n### MEDIA CONTEXT (PHOTO RECEIVED):\nThe contact sent a photo! Compliment her cute/beautiful picture warmly and affectionately as her loving boyfriend 🥰❤️!"
        elif is_professional:
            system_content += "\n\n### MEDIA CONTEXT (PHOTO RECEIVED):\nThe contact sent an image/file. Acknowledge it professionally."
        else:
            system_content += "\n\n### MEDIA CONTEXT (PHOTO RECEIVED):\nThe contact sent a photo! React casually and naturally to the image (e.g. 'joss picture bro!')."

    messages = [{"role": "system", "content": system_content}]

    # ─── Recent Conversation History ──────────────────────────────────────────
    for msg in recent_messages:
        role = "assistant" if msg["sender"] in ["USER", "AI"] else "user"
        messages.append({
            "role": role,
            "content": msg["message"]
        })

    # ─── Current Incoming Message ─────────────────────────────────────────────
    if not recent_messages or recent_messages[-1].get("message") != current_message:
        messages.append({
            "role": "user",
            "content": current_message
        })

    return messages
