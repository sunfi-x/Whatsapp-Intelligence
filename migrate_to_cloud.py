import sqlite3
import httpx
import json

LOCAL_DB_PATH = 'backend/whatsapp_ai.db'
CLOUD_URL = 'https://whatsapp-intelligence.onrender.com/api/v1/admin/import-db'

def run_migration():
    print("Reading local database...")
    conn = sqlite3.connect(LOCAL_DB_PATH)
    cursor = conn.cursor()

    # 1. Fetch contacts
    cursor.execute("SELECT id, name, phone, relationship, preferred_language, preferred_tone, notes, ai_status FROM contacts")
    contacts_rows = cursor.fetchall()
    id_to_phone = {}
    contacts_data = []

    for row in contacts_rows:
        cid, name, phone, rel, lang, tone, notes, ai_status = row
        id_to_phone[cid] = phone
        contacts_data.append({
            "name": name,
            "phone": phone,
            "relationship": rel or "Unknown",
            "preferred_language": lang or "Banglish",
            "preferred_tone": tone or "Casual",
            "notes": notes,
            "ai_status": ai_status or "OFF"
        })

    # 2. Fetch messages
    cursor.execute("SELECT contact_id, sender, message, message_type, timestamp, whatsapp_message_id FROM messages")
    messages_rows = cursor.fetchall()
    messages_data = []

    for row in messages_rows:
        cid, sender, msg, msg_type, ts, wamid = row
        phone = id_to_phone.get(cid)
        if phone:
            messages_data.append({
                "phone": phone,
                "sender": sender,
                "message": msg,
                "message_type": msg_type or "text",
                "timestamp": ts,
                "whatsapp_message_id": wamid
            })

    print(f"Extracted {len(contacts_data)} contacts and {len(messages_data)} messages from local DB.")

    payload = {
        "contacts": contacts_data,
        "messages": messages_data
    }

    print("Sending payload to Render Cloud DB...")
    with httpx.Client(timeout=60.0) as client:
        res = client.post(CLOUD_URL, json=payload)
        print("Response Code:", res.status_code)
        print("Response JSON:", res.json())

if __name__ == '__main__':
    run_migration()
