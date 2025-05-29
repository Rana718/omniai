from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import os
from models.models import User, Chat, QAHistory

async def init_db():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"))
    try:
        await init_beanie(database=client.textdb, document_models=[User, Chat, QAHistory])
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Error initializing database: {e}")
