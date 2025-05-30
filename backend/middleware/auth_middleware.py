from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from jose import jwt, JWTError
from fastapi.security import HTTPBearer
import os
from fnmatch import fnmatch
from models.models import User

SECRET_KEY = os.getenv("JWT_SECRET", "supersecret")
ALGORITHM = "HS256"
auth_scheme = HTTPBearer(auto_error=False)


PUBLIC_URLS = [
    "/",                 
    "/auth/**",          
]

def is_public_path(path: str) -> bool:
    return any(fnmatch(path, pattern) for pattern in PUBLIC_URLS)

class JWTAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        if request.method == "OPTIONS":
            return await call_next(request)

        if is_public_path(path):
            return await call_next(request)

        credentials = await auth_scheme(request)
        if credentials is None:
            return JSONResponse(status_code=401, content={"detail": "Authorization token missing"})

        token = credentials.credentials
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            if not email:
                return JSONResponse(status_code=401, content={"detail": "Invalid token payload"})

            user = await User.find_one({"email": email})
            if user is None:
                return JSONResponse(status_code=404, content={"detail": "User not found"})

            request.state.user = user
        except JWTError:
            return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})

        return await call_next(request)
