from app.ai.persona import SYSTEM_RULES, DEFAULT_PERSONA


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
    """Assembles a modular system prompt and chat history context for OpenAI."""
    
    persona = persona_override if persona_override and persona_override.strip() else DEFAULT_PERSONA
    tone = tone_override if tone_override else preferred_tone

    system_content = f"""{SYSTEM_RULES}

### USER PERSONA & COMMUNICATION STYLE:
{persona}

### CONTACT PROFILE:
- Name: {contact_name}
- Relationship: {relationship}
- Preferred Language: {preferred_language}
- Target Tone: {tone}
- Contact Notes: {notes or 'None'}

### LONG-TERM CONVERSATION MEMORY:
- Summary: {summary or 'No historical summary available.'}
- Important Context: {important_context or 'None'}
"""

    messages = [{"role": "system", "content": system_content}]

    # Include recent conversation messages (up to 15-20 messages)
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
