import grpc
from pb import service_pb2, service_pb2_grpc
import os
from dotenv import load_dotenv
import asyncio
import threading
from typing import Optional

load_dotenv()

address = os.getenv("GRPC_SERVER_ADDRESS", "localhost:50051")

class ServiceClient:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(ServiceClient, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if not getattr(self, '_initialized', False):
            self._channel: Optional[grpc.aio.Channel] = None
            self._stub: Optional[service_pb2_grpc.ServiceStub] = None
            self._connection_lock = asyncio.Lock()
            self._initialized = True

    async def _get_channel_and_stub(self):
        """Get or create channel and stub with proper event loop handling"""
        async with self._connection_lock:
            try:
                # Check if we need to create or recreate the connection
                if (self._channel is None or 
                    self._channel._channel.check_connectivity_state(True) != grpc.ChannelConnectivity.READY):
                    
                    # Close existing channel if it exists
                    if self._channel:
                        try:
                            await self._channel.close()
                        except Exception as e:
                            print(f"Warning: Error closing existing channel: {e}")
                    
                    # Create new channel and stub
                    self._channel = grpc.aio.insecure_channel(address)
                    self._stub = service_pb2_grpc.ServiceStub(self._channel)
                    
                return self._channel, self._stub
                
            except Exception as e:
                print(f"Error creating gRPC connection: {e}")
                self._channel = None
                self._stub = None
                raise

    async def create_chat(self, doc_id: str, user_id: str, doc_text: str):
        """Create a new chat"""
        try:
            _, stub = await self._get_channel_and_stub()
            request = service_pb2.CreateRequest(
                doc_id=doc_id,
                user_id=user_id,
                doc_text=doc_text
            )
            
            # Set timeout for the request
            response = await stub.CreateChat(request, timeout=30.0)
            
            if response.IsError: 
                print(f"Error creating chat: {response.Message}")
                return None
            
            return response
            
        except grpc.RpcError as e:
            print(f"gRPC error in create_chat: {e.code()} - {e.details()}")
            return None
        except Exception as e:
            print(f"Unexpected error in create_chat: {e}")
            return None

    async def get_chat(self, doc_id: str):
        """Get chat by document ID"""
        try:
            _, stub = await self._get_channel_and_stub()
            request = service_pb2.ChatRequest(doc_id=doc_id)
            
            # Set timeout for the request
            response = await stub.GetChats(request, timeout=30.0)

            if response.IsError: 
                print(f"Error fetching chat: {response.Message}")
                return None
            
            return response
            
        except grpc.RpcError as e:
            print(f"gRPC error in get_chat: {e.code()} - {e.details()}")
            return None
        except Exception as e:
            print(f"Unexpected error in get_chat: {e}")
            return None

    async def authenticate_user(self, jwt_token: str):
        """Authenticate user with JWT token"""
        try:
            _, stub = await self._get_channel_and_stub()
            request = service_pb2.AuthenticateRequest(jwt_token=jwt_token)
            
            # Set timeout for the request
            response = await stub.AuthenticateUser(request, timeout=30.0)

            if response.isAuthenticate: 
                print(f"User authenticated successfully: {response.user_id}")  
                return response.user_id  
            else:
                print("Authentication failed")
                return None
                
        except grpc.RpcError as e:
            print(f"gRPC error in authenticate_user: {e.code()} - {e.details()}")
            return None
        except Exception as e:
            print(f"Unexpected error in authenticate_user: {e}")
            return None

    async def close(self):
        """Close the gRPC connection"""
        async with self._connection_lock:
            if self._channel:
                try:
                    await self._channel.close()
                    print("gRPC channel closed successfully")
                except Exception as e:
                    print(f"Error closing gRPC channel: {e}")
                finally:
                    self._channel = None
                    self._stub = None
