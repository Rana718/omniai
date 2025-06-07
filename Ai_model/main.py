from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes import pdf_routes
import uvicorn
from utils.redis_config import init_redis, close_redis
from utils.pinecone import init_pinecone, get_pinecone_stats


load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting up...")
    try:
        await init_redis()
    except Exception as e:
        print(f"❌ Failed to initialize Redis: {e}")
        print("⚠️ Application will continue without Redis caching")
    
    if init_pinecone():
        pinecone_stats = get_pinecone_stats()
        print(f"✅ Pinecone initialized - {pinecone_stats}")
    else:
        print("❌ Failed to initialize Pinecone")
        
    yield
    
    print("🛑 Shutting down...")
    try:
        await close_redis()
    except Exception as e:
        print(f"⚠️ Error during Redis shutdown: {e}")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pdf_routes.app, prefix="/pdf", tags=["pdf"])

@app.get("/")
async def root():
    return {"message": "Welcome to the PDF Processing API!"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)