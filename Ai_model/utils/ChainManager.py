from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain.chains.question_answering import load_qa_chain
from langchain.prompts import PromptTemplate
from langchain_pinecone import PineconeVectorStore
import asyncio
import time
from utils.redis_config import get_redis
from utils.pinecone import get_pinecone_index
from functools import lru_cache
from .api_key import APIKeyManager
import os

CHAIN_TIMEOUT = 300
api_key_manager = APIKeyManager()

class OptimizedChainManager:
    def __init__(self):
        self.chains = {}
        self.models = {}  # Direct model storage for hybrid mode
        self.last_used = {}
        self.cleanup_task = None
        self.model_pool = {}

    async def get_chain(self, doc_id: str, context_only: bool = False):
        current_time = time.time()
        chain_key = f"{doc_id}_{context_only}"
        
        if chain_key in self.chains and chain_key in self.last_used:
            if current_time - self.last_used[chain_key] < CHAIN_TIMEOUT:
                self.last_used[chain_key] = current_time
                print(f"♻️ Reusing existing chain for doc_id: {doc_id}, context_only: {context_only}")
                return self.chains[chain_key]
            else:
                await self._remove_chain(chain_key)

        chain = await self._create_optimized_chain(doc_id, context_only)
        self.chains[chain_key] = chain
        self.last_used[chain_key] = current_time

        if self.cleanup_task is None or self.cleanup_task.done():
            self.cleanup_task = asyncio.create_task(self._cleanup_expired_chains())

        return chain

    async def get_direct_model(self, doc_id: str):
        """Get direct model for hybrid mode without chain constraints"""
        current_time = time.time()
        model_key = f"direct_{doc_id}"
        
        if model_key in self.models and model_key in self.last_used:
            if current_time - self.last_used[model_key] < CHAIN_TIMEOUT:
                self.last_used[model_key] = current_time
                print(f"♻️ Reusing direct model for doc_id: {doc_id}")
                return self.models[model_key]
            else:
                await self._remove_model(model_key)

        model = await self._get_pooled_model()
        self.models[model_key] = model
        self.last_used[model_key] = current_time
        
        print(f"✅ Created direct model for doc_id: {doc_id}")
        return model

    async def _create_optimized_chain(self, doc_id: str, context_only: bool = False):
        try:
            embeddings = await get_cached_embeddings()
            model = await self._get_pooled_model()
            
            # Only create chains for context-only mode
            if context_only:
                prompt_template = """You are Jack, a helpful AI assistant. Answer ONLY based on the provided document context.

                STRICT INSTRUCTIONS:
                - Use ONLY the information from the provided context
                - If the context doesn't contain information to answer the question, say "The provided documents do not contain information about this topic. Please ask about topics covered in your uploaded documents."
                - Do NOT use external knowledge or make assumptions
                - Be direct and factual
                - Reference the document content directly

                CONVERSATION HISTORY:
                {history}

                DOCUMENT CONTEXT:
                {context}

                USER QUESTION: {question}

                ANSWER (based only on the provided context):"""
                
                prompt = PromptTemplate(
                    template=prompt_template,
                    input_variables=["context", "question", "history"]
                )
                chain = load_qa_chain(model, chain_type="stuff", prompt=prompt)
                print(f"✅ Created context-only chain for doc_id: {doc_id}")
                return chain
            else:
                # For hybrid mode, we'll use direct model calls instead of chains
                print(f"✅ Hybrid mode will use direct model calls for doc_id: {doc_id}")
                return None
                
        except Exception as e:
            print(f"❌ Error creating chain for {doc_id}: {e}")
            raise

    async def _get_pooled_model(self):
        api_key = api_key_manager.get_next_key()
        if api_key not in self.model_pool:
            try:
                model = ChatGoogleGenerativeAI(
                    model="gemini-2.0-flash",
                    temperature=0.3,
                    google_api_key=api_key,
                    max_tokens=512,
                )
                self.model_pool[api_key] = model
                print(f"✅ Created new model for API key: {api_key[-10:]}")
            except Exception as e:
                api_key_manager.report_error(api_key)
                print(f"❌ Error creating model with API key {api_key[-10:]}: {e}")
                raise
        return self.model_pool[api_key]

    async def _remove_chain(self, chain_key: str):
        if chain_key in self.chains:
            del self.chains[chain_key]
        if chain_key in self.last_used:
            del self.last_used[chain_key]
        print(f"🗑️ Removed expired chain: {chain_key}")

    async def _remove_model(self, model_key: str):
        if model_key in self.models:
            del self.models[model_key]
        if model_key in self.last_used:
            del self.last_used[model_key]
        print(f"🗑️ Removed expired model: {model_key}")

    async def _cleanup_expired_chains(self):
        while True:
            try:
                await asyncio.sleep(60)
                current_time = time.time()
                expired_items = []

                # Check chains
                for chain_key, last_used_time in self.last_used.items():
                    if current_time - last_used_time > CHAIN_TIMEOUT:
                        expired_items.append(chain_key)

                for item_key in expired_items:
                    if item_key in self.chains:
                        await self._remove_chain(item_key)
                    elif item_key in self.models:
                        await self._remove_model(item_key)

                api_key_manager.reset_error_counts()

                if not self.chains and not self.models:
                    print("🧹 No active chains or models, stopping cleanup task")
                    break

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"❌ Error in cleanup task: {e}")

@lru_cache(maxsize=1)
def get_cached_embeddings_sync():
    api_key = api_key_manager.get_next_key()
    return GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=api_key
    )

async def get_cached_embeddings():
    redis_client = get_redis()
    cache_key = "embeddings:google_generative_ai_v2"

    try:
        cached_embeddings = await redis_client.get(cache_key)
        if cached_embeddings:
            print("✅ Retrieved embeddings from Redis cache")
            return get_cached_embeddings_sync()
    except Exception as e:
        print(f"⚠️ Redis cache miss for embeddings: {e}")

    embeddings = get_cached_embeddings_sync()

    try:
        await redis_client.setex(cache_key, 7200, "cached")
        print("✅ Cached embeddings marker in Redis")
    except Exception as e:
        print(f"⚠️ Failed to cache embeddings marker in Redis: {e}")

    return embeddings

async def get_pinecone_vector_store(doc_id: str, embeddings):
    """Get or create Pinecone vector store for document"""
    try:
        index = get_pinecone_index()
        
        # Create namespace for the document
        namespace = f"doc_{doc_id}"
        
        # Create PineconeVectorStore
        vector_store = PineconeVectorStore(
            index=index,
            embedding=embeddings,
            namespace=namespace,
            text_key="text"
        )
        
        print(f"✅ Connected to Pinecone vector store for doc_id: {doc_id}")
        return vector_store
        
    except Exception as e:
        print(f"❌ Error getting Pinecone vector store for {doc_id}: {e}")
        raise