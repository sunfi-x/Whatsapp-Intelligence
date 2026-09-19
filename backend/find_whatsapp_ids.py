import httpx
import asyncio

token = "EAAPGz5LHewIBSkNmewjaMmJrxvztZAZC43Kps0n0VZB49JJI9qMPIYm7k6WwFKXcKBMGs0S0JJQ4kfdJRnWAYlEjyjhV4S91lRGWDUuuhiGTTxXfS3bIBtzBVkzWpWj3X0G8fYZBupadJnx8cvZCzXZA8qZBqH87UbAvwVmdEKv7BZA0lBTgh7V01XlwVuUZC14SL3AZDZD"

async def find_ids():
    async with httpx.AsyncClient() as client:
        # Query 1: GET /v22.0/me
        r1 = await client.get(f"https://graph.facebook.com/v22.0/me?access_token={token}")
        print("ME QUERY:", r1.status_code, r1.json())

        # Query 2: GET WABA phone numbers using WABA ID 1129506496408657
        waba_id = "1129506496408657"
        r2 = await client.get(f"https://graph.facebook.com/v22.0/{waba_id}/phone_numbers?access_token={token}")
        print("WABA PHONE NUMBERS:", r2.status_code, r2.json())

if __name__ == "__main__":
    asyncio.run(find_ids())
