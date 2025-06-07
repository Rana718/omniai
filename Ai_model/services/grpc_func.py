import grpc
from pb import service_pb2, service_pb2_grpc
import os
from dotenv import load_dotenv
load_dotenv()

address = os.getenv("GRPC_SERVER_ADDRESS", "localhost:50051")

class ServiceClient:
    def __init__(self):
        self.channel = grpc.insecure_channel(address)
        self.stub = service_pb2_grpc.ServiceStub(self.channel)

    async def create_chat(self, doc_id, user_id, doc_text):
        request = service_pb2.CreateRequest(
            doc_id=doc_id,
            user_id=user_id,
            doc_text=doc_text
        )
        response = self.stub.CreateChat(request)
        
        if response.IsError: 
            print(f"Error creating chat: {response.Message}")
            return None
        
        return response

    async def get_chat(self, doc_id):
        request = service_pb2.ChatRequest(doc_id=doc_id)
        response = self.stub.GetChats(request)

        if response.IsError: 
            print(f"Error fetching chat: {response.Message}")
            return None
        
        return response
