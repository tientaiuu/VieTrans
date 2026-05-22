import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

async def insert_mock():
    client = AsyncIOMotorClient('mongodb://localhost:27017/')
    db = client['vietrans']
    
    # get a user
    user = await db.users.find_one()
    if not user:
        print("No user found in DB")
        return
        
    uid = str(uuid.uuid4())
    base = "/api/images"
    stages = {
        "input":   f"{base}/input/{uid}",
        "back":    f"{base}/back/{uid}",
        "text_en": f"{base}/text_en/{uid}",
        "text_vi": f"{base}/text_vi/{uid}",
        "fuse":    f"{base}/fuse/{uid}",
    }
    
    await db.histories.insert_one({
        "user_email": user["email"],
        "sample_id": uid,
        "tit": "Mock translation",
        "ocr": "",
        "stages": stages,
        "created_at": datetime.now(timezone.utc)
    })
    print("Mock history inserted for", user["email"])

if __name__ == '__main__':
    asyncio.run(insert_mock())
