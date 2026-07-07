from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes import pdf_routes
import uvicorn
from utils.redis_config import init_redis, close_redis
from utils.pinecone import init_pinecone, get_pinecone_stats
from middleware.middleware import JWTAuthMiddleware


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
    
    # Initialize gRPC client
    try:
        from services.grpc_func import ServiceClient
        grpc_client = ServiceClient()
        print("✅ gRPC client initialized")
    except Exception as e:
        print(f"❌ Failed to initialize gRPC client: {e}")
        
    yield
    
    print("🛑 Shutting down...")
    try:
        await close_redis()
    except Exception as e:
        print(f"⚠️ Error during Redis shutdown: {e}")
    
    # Close gRPC client
    try:
        grpc_client = ServiceClient()
        await grpc_client.close()
        print("✅ gRPC client closed")
    except Exception as e:
        print(f"⚠️ Error during gRPC client shutdown: {e}")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(JWTAuthMiddleware)

app.include_router(pdf_routes.app, prefix="/chat", tags=["chat"])

@app.get("/")
async def root():
    return {"message": "Welcome to the PDF Processing API!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/jwt-tok")
async def jwt_token_example(request: Request):
    user_id = request.state.user_id

    if not user_id:
        return {"error": "User ID not found in request state"}
    return {"message": f"JWT token for user {user_id} is valid."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
