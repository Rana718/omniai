import os
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv

load_dotenv()

class PineconeManager:
    def __init__(self):
        self.api_key = os.getenv("PINECONE_API_KEY")
        self.index_name = os.getenv("PINECONE_INDEX_NAME", "pdf-chatter-docs")
        self.pc = None
        self.index = None
        
    def initialize(self):
        """Initialize Pinecone client and index"""
        try:
            self.pc = Pinecone(api_key=self.api_key)
            
            # Check if index exists, create if not
            existing_indexes = [index.name for index in self.pc.list_indexes()]
            
            if self.index_name not in existing_indexes:
                print(f"Creating Pinecone index: {self.index_name}")
                
                # Use correct serverless spec for free tier
                self.pc.create_index(
                    name=self.index_name,
                    dimension=768,  # Google embeddings dimension
                    metric="cosine",
                    spec=ServerlessSpec(
                        cloud="aws",  # Changed to AWS
                        region="us-east-1"  # Changed to valid region
                    )
                )
                
                # Wait for index to be ready
                import time
                print("⏳ Waiting for index to be ready...")
                time.sleep(10)  # Wait for index creation
                
            else:
                print(f"✅ Using existing Pinecone index: {self.index_name}")
            
            self.index = self.pc.Index(self.index_name)
            print(f"✅ Pinecone initialized successfully - Index: {self.index_name}")
            return True
            
        except Exception as e:
            print(f"❌ Error initializing Pinecone: {e}")
            
            # Try to list available regions for debugging
            try:
                print("📋 Available Pinecone configurations:")
                indexes = self.pc.list_indexes() if self.pc else []
                for idx in indexes:
                    print(f"  - Index: {idx.name}, Host: {idx.host}")
            except Exception as debug_e:
                print(f"❌ Could not list indexes: {debug_e}")
            
            return False
    
    def get_index(self):
        """Get Pinecone index"""
        if not self.index:
            if not self.initialize():
                raise Exception("Failed to initialize Pinecone")
        return self.index
    
    def get_stats(self):
        """Get index statistics"""
        try:
            if self.index:
                stats = self.index.describe_index_stats()
                return {
                    "total_vector_count": stats.get('total_vector_count', 0),
                    "namespaces": stats.get('namespaces', {}),
                    "dimension": stats.get('dimension', 768),
                    "index_fullness": stats.get('index_fullness', 0.0)
                }
        except Exception as e:
            print(f"❌ Error getting Pinecone stats: {e}")
            return {"error": str(e)}

# Global Pinecone manager
pinecone_manager = PineconeManager()

def get_pinecone_index():
    """Get Pinecone index instance"""
    return pinecone_manager.get_index()

def init_pinecone():
    """Initialize Pinecone"""
    return pinecone_manager.initialize()

def get_pinecone_stats():
    """Get Pinecone statistics"""
    return pinecone_manager.get_stats()