from fastapi import APIRouter, HTTPException, Request, Depends
from passlib.hash import bcrypt
from jose import jwt
from datetime import datetime, timedelta
import os
from models.models import UserCreate, UserLogin, Token, User

router = APIRouter()

SECRET_KEY = os.getenv("JWT_SECRET", "supersecret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 43200

def create_token(data: dict):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/signup", response_model=Token)
async def signup(user: UserCreate):
    if await User.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = bcrypt.hash(user.password)
    
    await User(email=user.email, name=user.name, hashed_password=hashed).insert()

    return {
        "access_token": create_token({"sub": user.email}),
        "token_type": "bearer",
        "user": {
            "email": user.email,
            "name": user.name
        }
    }

@router.post("/login", response_model=Token)
async def login(user: UserLogin):
    db_user = await User.find_one({"email": user.email})
    if not db_user or not bcrypt.verify(user.password, db_user.hashed_password): 
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "access_token": create_token({"sub": db_user.email}), 
        "token_type": "bearer",
        "user": {
            "email": db_user.email,
            "name": db_user.name
        }
    }
