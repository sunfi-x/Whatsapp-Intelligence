from app.ai.persona import SYSTEM_RULES, DEFAULT_PERSONA, ROMANTIC_PERSONA, FRIEND_PERSONA, PROFESSIONAL_PERSONA


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
    
    base_persona = persona_override if persona_override and persona_override.strip() else DEFAULT_PERSONA
    tone = tone_override if tone_override else preferred_tone

    rel_lower = (relationship or "").lower()
    tone_lower = (tone or "").lower()
    lang_lower = (preferred_language or "banglish").lower()

    # Determine script of current message
    is_bangla_script_msg = any('\u0980' <= char <= '\u09FF' for char in current_message)

    # Exact relationship classification
    is_romantic = any(kw in rel_lower or kw in tone_lower or kw in (contact_name or "").lower() for kw in ["girl", "gf", "romantic", "love", "loving", "flirty", "orin", "rio"])
    is_professional = any(kw in rel_lower or kw in tone_lower or kw in (contact_name or "").lower() for kw in ["work", "professional", "boss", "colleague", "lead", "arif"])
    is_friend = any(kw in rel_lower or kw in tone_lower for kw in ["friend", "classmate", "buddy", "funny", "casual"]) or not (is_romantic or is_professional)

    if is_romantic:
        selected_persona = f"{base_persona}\n\n{ROMANTIC_PERSONA}"
        mode_tag = "[EXPLICIT_CONTACT_MODE: ROMANTIC_GIRLFRIEND]"
    elif is_professional:
        selected_persona = f"{base_persona}\n\n{PROFESSIONAL_PERSONA}"
        mode_tag = "[EXPLICIT_CONTACT_MODE: PROFESSIONAL_WORK]"
    else:
        selected_persona = f"{base_persona}\n\n{FRIEND_PERSONA}"
        mode_tag = "[EXPLICIT_CONTACT_MODE: FRIEND_CLASSMATE]"

    # Explicit Language Rule for Gemini
    if is_bangla_script_msg:
        lang_directive = "MANDATORY OUTPUT LANGUAGE: BENGALI SCRIPT (বাংলা). Reply using proper Bengali script characters!"
    elif "english" in lang_lower and is_professional:
        lang_directive = "MANDATORY OUTPUT LANGUAGE: ENGLISH. Reply in clear, natural, professional English."
    else:
        lang_directive = "MANDATORY OUTPUT LANGUAGE: BANGLISH (Bangla spoken words written using English/Roman alphabet, e.g. 'kemon acho', 'bhalo achi bro', 'ki korcho jan'). DO NOT reply in plain English!"

    system_content = f"""{SYSTEM_RULES}

{mode_tag}

### MANDATORY OUTPUT LANGUAGE DIRECTIVE:
{lang_directive}

### CATEGORIZED PERSONA DEFINITION:
{selected_persona}

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

    # Media hint injection
    is_photo = any(kw in current_message.lower() for kw in ["photo", "image", "📷", "picture", "[image"])
    if is_photo:
        if is_romantic:
            system_content += "\n\n### MEDIA CONTEXT (PHOTO RECEIVED):\nThe contact sent a photo! Compliment her cute/beautiful picture warmly and affectionately as her loving boyfriend 🥰❤️!"
        elif is_professional:
            system_content += "\n\n### MEDIA CONTEXT (PHOTO RECEIVED):\nThe contact sent an image/file. Acknowledge it professionally."
        else:
            system_content += "\n\n### MEDIA CONTEXT (PHOTO RECEIVED):\nThe contact sent a photo! React casually and naturally to the image (e.g. 'joss picture bro!')."

    messages = [{"role": "system", "content": system_content}]

    # Include recent conversation messages
    for msg in recent_messages:
        role = "assistant" if msg["sender"] in ["USER", "AI"] else "user"
        messages.append({
            "role": role,
            "content": msg["message"]
        })

    # Append current incoming message if not already in recent history
    if not recent_messages or recent_messages[-1].get("message") != current_message:
        messages.append({
            "role": "user",
            "content": current_message
        })

    return messages
