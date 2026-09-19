import re

def normalize_phone_number(phone: str) -> str:
    """Normalizes any phone number into canonical international digits format.
    Removes +, -, spaces, parentheses.
    Converts 11-digit Bangladesh numbers starting with 01 (e.g. 01712345678 -> 8801712345678).
    """
    if not phone:
        return ""
    clean = re.sub(r"\D", "", str(phone))
    if clean.startswith("01") and len(clean) == 11:
        return f"88{clean}"
    if clean.startswith("00"):
        clean = clean[2:]
    return clean
