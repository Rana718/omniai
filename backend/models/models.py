from beanie import Document, Insert, Link, before_event
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# User Model
class User(Document):
    email: EmailStr
    name: str
    hashed_password: str

    class Settings:
        name = "users"

# Chat Model
class Chat(Document):
    user: Link[User]
    user_email: Optional[EmailStr] = None  
    doc_id: str
    doc_text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "chats"

    @before_event(Insert)
    async def fill_user_email(self):
        if self.user_email is None and self.user:
            if isinstance(self.user, Link):
                user_doc = await self.user.fetch()
            else:
                user_doc = self.user
            self.user_email = user_doc.email

# Question-Answer history model
class QAHistory(Document):
    chat: Link[Chat]
    question: str
    answer: str
    timestamp: datetime = datetime.utcnow()

    class Settings:
        name = "history"

# Tokens (unchanged)
class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[dict] = None

# For signup/login
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
