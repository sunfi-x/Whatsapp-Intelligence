from app.ai.persona import SYSTEM_RULES, DEFAULT_PERSONA, ROMANTIC_PERSONA


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

    # Exact relationship classification
    is_romantic = any(kw in rel_lower or kw in tone_lower for kw in ["girl", "gf", "romantic", "love", "loving", "flirty"])
    is_professional = any(kw in rel_lower or kw in tone_lower for kw in ["work", "professional", "boss", "colleague", "lead"])
    is_friend = any(kw in rel_lower or kw in tone_lower for kw in ["friend", "classmate", "buddy", "funny", "casual"])

    persona_section = base_persona
    if is_romantic:
        persona_section = f"{base_persona}\n\n{ROMANTIC_PERSONA}"
        relationship_mode_instruction = "MODE: Girlfriend / Romantic Partner. Speak with deep warmth, sweetness, romantic endearments ('jan', 'babu', 'shona', 'tumi'), and affection."
    elif is_professional:
        relationship_mode_instruction = "MODE: Professional Work Contact. Speak politely, clearly, respectfully, and professionally. ABSOLUTELY DO NOT use romantic endearments (jan/babu/shona) or informal slang!"
    elif is_friend:
        relationship_mode_instruction = "MODE: Friend / Classmate / Gaming Buddy. Speak in a casual, friendly, youth style ('bro', 'kire', 'dost', 'bhai'). ABSOLUTELY DO NOT use romantic endearments (jan/babu/shona)!"
    else:
        relationship_mode_instruction = "MODE: General Contact. Speak neutrally, politely, and casually. DO NOT use romantic terms."

    system_content = f"""{SYSTEM_RULES}

### SPECIFIC CONTACT RELATIONSHIP MODE:
{relationship_mode_instruction}

### CONTACT PROFILE:
- Contact Name: {contact_name}
- Relationship Type: {relationship} (Is Girlfriend / Romantic: {'YES' if is_romantic else 'NO'})
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
