from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from services.grpc_func import ServiceClient
import logging

logger = logging.getLogger(__name__)

grpc_client = ServiceClient()

class JWTAuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.public_routes = {"/", "/sys", "/health", "/metrics" }
    
    def is_public_route(self, path: str) -> bool:
        """Check if the route is public and doesn't require authentication"""
        if path in self.public_routes:
            return True
        
        for public_route in self.public_routes:
            if path.startswith(public_route) and public_route != "/":
                return True
        
        return False
    
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)
            
        if self.is_public_route(request.url.path):
            return await call_next(request)
        
        authorization = request.headers.get("Authorization")
        if not authorization:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Authorization header missing"}
            )
        
        try:
            scheme, token = authorization.split(" ", 1)
            if scheme.lower() != "bearer":
                raise ValueError("Invalid authorization scheme")
        except ValueError:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid authorization header format. Expected 'Bearer <token>'"}
            )
        
        try:
            user_id = await grpc_client.authenticate_user(token)
            if user_id is None:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Invalid or expired token"}
                )
            
            request.state.user_id = user_id
            request.state.jwt_token = token
            
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Authentication service unavailable"}
            )
        
        return await call_next(request)