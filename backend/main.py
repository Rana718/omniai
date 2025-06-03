from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from middleware.auth_middleware import JWTAuthMiddleware
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes import auth, pdfchat
import uvicorn
from db.db import init_db
from config.redis_config import init_redis, close_redis

load_dotenv()
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting up...")
    await init_db()
    await init_redis()
    yield
    print("🛑 Shutting down...")
    await close_redis()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.add_middleware(JWTAuthMiddleware)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(pdfchat.app, prefix="/pdfchat", tags=["pdfchat"])

@app.get("/protected")
async def protected_route(request: Request):
    user = request.state.user 
    return {"message": f"Welcome {user['email']}"}

@app.get("/")
async def root():
    return {"message": "Welcome to the FastAPI application!"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
